const express = require('express');
const router = express.Router();
const llmClient = require('../llm/client');
const { toolMap } = require('../tools');
const {
  buildExecutionMeta,
  buildSystemPrompt,
  normalizeExecutionArgs,
  summarizeToolResult
} = require('./chat.helpers');

const MAX_TOOL_CHAIN = 10;

function getDirectToolIntent(message) {
  const text = String(message || '').toLowerCase().trim();

  if (!text) return null;

  const countMatch = text.match(/\b(?:last|past|recent)\s+(\d+)\b/) || text.match(/\b(\d+)\s+(?:last|past|recent)\b/);
  const count = countMatch ? Math.min(Number(countMatch[1]), 50) : null;
  const asksPastTasks = /\b(past|overdue|late|missed)\b/.test(text);

  if (count && /\b(pending|incomplete|remaining)\b/.test(text) && /\b(show|list|display|view)\b/.test(text) && /\b(task|tasks|todo|todos)\b/.test(text)) {
    return {
      toolName: 'get_tasks',
      args: asksPastTasks
        ? { filter: 'overdue', sort: 'due', limit: count }
        : { filter: 'pending', sort: 'recent', limit: count }
    };
  }

  if (count && /\b(delete|remove|clear)\b/.test(text) && /\b(pending|incomplete|remaining)\b/.test(text) && /\b(task|tasks|todo|todos)\b/.test(text)) {
    return {
      toolName: 'bulk_delete_tasks',
      args: asksPastTasks
        ? { filter: 'overdue', sort: 'due', limit: count }
        : { filter: 'pending', sort: 'recent', limit: count }
    };
  }

  if (asksPastTasks && /\b(task|tasks|todo|todos)\b/.test(text)) {
    return {
      toolName: 'get_tasks',
      args: { filter: 'overdue' }
    };
  }

  if (/\b(telegram|integrations?|profile)\b/.test(text) && /\b(linked|connected|status|confirm|check)\b/.test(text)) {
    return {
      toolName: 'telegram_status',
      args: {}
    };
  }

  return null;
}

router.get('/health', (req, res) => {
  const geminiConfigs = llmClient.getGeminiConfigs();

  res.json({
    status: 'ok',
    service: 'mcp-server',
    model: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
    rotationMode: process.env.GEMINI_ROTATION_MODE || null,
    geminiConfigurations: geminiConfigs.map(config => ({
      id: config.id,
      source: config.source,
      model: config.model,
      usageStats: config.usageStats,
      lastFailureTimestamp: config.lastFailureTimestamp,
      cooldownUntil: config.cooldownUntil,
      inCooldown: config.inCooldown
    })),
    backendUrl: process.env.BACKEND_URL || null,
    timestamp: new Date().toISOString()
  });
});

router.post('/chat', async (req, res) => {
  try {
    const { message, history, localDate, localTimeString, userTimezone } = req.body;
    const token = req.headers['authorization']?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Missing auth token' });
    }

    const fallbackDate = new Date().toISOString().split('T')[0];
    const currentDate = localDate || fallbackDate;
    const currentTime = localTimeString || new Date().toLocaleTimeString('en-US');
    const tz = userTimezone || 'UTC';

    let weekday = 'Unknown';
    try {
      const parts = currentDate.split('-');
      if (parts.length === 3) {
        weekday = new Date(parts[0], parts[1] - 1, parts[2]).toLocaleDateString('en-US', { weekday: 'long' });
      }
    } catch (error) {
      console.warn('[Chat Route] Failed to derive weekday:', error.message);
    }

    const executionMeta = buildExecutionMeta({ currentDate, currentTime, tz, weekday });
    const systemPrompt = buildSystemPrompt(executionMeta);
    const debugTrace = [];
    const normalizedHistory = Array.isArray(history) ? [...history] : [];

    const directIntent = getDirectToolIntent(message);
    if (directIntent) {
      const tool = toolMap[directIntent.toolName];
      const executionArgs = normalizeExecutionArgs(directIntent.args, executionMeta);

      if (tool) {
        console.log(`[MCP] Executing direct intent: ${directIntent.toolName}`, executionArgs);
        const toolResult = await tool.execute(executionArgs, token);

        return res.json({
          reply: summarizeToolResult(directIntent.toolName, toolResult),
          data: toolResult,
          history: llmClient.getHistory(),
          toolUsed: directIntent.toolName,
          directIntent: true,
          debugTrace: [{ step: 'direct_intent', tool: directIntent.toolName, arguments: executionArgs }]
        });
      }
    }

    const lastHistoryItem = normalizedHistory[normalizedHistory.length - 1];
    if (lastHistoryItem?.role === 'user' && lastHistoryItem.content === message) {
      normalizedHistory.pop();
    }

    let llmResponse = await llmClient.run({
      message,
      history: normalizedHistory,
      tools: Object.values(toolMap),
      systemPrompt
    });

    debugTrace.push({
      step: 'llm_initial',
      toolCall: llmResponse.toolCall?.name || null,
      preview: llmResponse.text?.slice(0, 200) || null
    });

    let chainCount = 0;
    let lastToolResult = null;
    let lastToolName = null;

    while (llmResponse.toolCall && chainCount < MAX_TOOL_CHAIN) {
      chainCount += 1;
      const toolName = llmResponse.toolCall.name;
      const tool = toolMap[toolName];
      const executionArgs = normalizeExecutionArgs(llmResponse.toolCall.arguments, executionMeta);

      if (!tool) {
        return res.json({
          reply: `Error: Tool ${toolName} not found.`,
          history: llmClient.getHistory(),
          debugTrace
        });
      }

      console.log(`[MCP] Executing tool (chain ${chainCount}/${MAX_TOOL_CHAIN}): ${toolName}`, executionArgs);
      debugTrace.push({ step: `tool_${chainCount}_start`, tool: toolName, arguments: executionArgs });

      let toolResult;
      try {
        toolResult = await tool.execute(executionArgs, token);
      } catch (toolError) {
        console.error(`[MCP] Tool ${toolName} threw unexpectedly:`, toolError);
        toolResult = {
          success: false,
          error: toolError.message || `Tool ${toolName} failed unexpectedly`
        };
      }

      console.log(`[MCP] Tool result (chain ${chainCount}):`, JSON.stringify(toolResult).substring(0, 500));
      debugTrace.push({
        step: `tool_${chainCount}_result`,
        tool: toolName,
        result: {
          success: toolResult?.success,
          ambiguous: toolResult?.ambiguous,
          message: toolResult?.message,
          error: toolResult?.error
        }
      });

      lastToolResult = toolResult;
      lastToolName = toolName;

      const continuedResponse = await llmClient.continueWithFunctionResponse(toolName, toolResult);
      debugTrace.push({
        step: `llm_after_${chainCount}`,
        toolCall: continuedResponse.toolCall?.name || null,
        preview: continuedResponse.text?.slice(0, 200) || null
      });

      if (continuedResponse.toolCall) {
        llmResponse = continuedResponse;
        continue;
      }

      let reply = continuedResponse.text?.trim();
      if (!reply || /^executed\s+/i.test(reply) || /^i executed/i.test(reply)) {
        reply = summarizeToolResult(lastToolName, lastToolResult);
      }

      return res.json({
        reply,
        data: lastToolResult,
        history: llmClient.getHistory(),
        toolUsed: lastToolName,
        toolChainLength: chainCount,
        debugTrace
      });
    }

    if (chainCount >= MAX_TOOL_CHAIN) {
      console.warn(`[MCP] Tool chain limit reached (${MAX_TOOL_CHAIN})`);
      const finalResponse = await llmClient.continueWithFunctionResponse(
        lastToolName,
        { ...lastToolResult, _chainLimitReached: true }
      );

      return res.json({
        reply: finalResponse.text || summarizeToolResult(lastToolName, lastToolResult),
        data: lastToolResult,
        history: llmClient.getHistory(),
        toolUsed: lastToolName,
        toolChainLength: chainCount,
        debugTrace
      });
    }

    return res.json({
      reply: llmResponse.text,
      history: llmClient.getHistory(),
      debugTrace
    });
  } catch (error) {
    console.error('[Chat Route] Error:', error);
    res.status(500).json({
      error: 'MCP Error',
      message: error.message
    });
  }
});

router.post('/chat/clear', (req, res) => {
  llmClient.clearHistory();
  res.json({ message: 'Conversation history cleared' });
});

module.exports = router;
