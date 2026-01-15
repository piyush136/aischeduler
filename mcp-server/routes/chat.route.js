const express = require('express');
const router = express.Router();
const llmClient = require('../llm/client');
const { toolMap } = require('../tools');

router.post('/chat', async (req, res) => {
  try {
    const { message, history } = req.body;
    const token = req.headers['authorization']?.split(' ')[1]; // Expecting Bearer token

    // 1. Call LLM with conversation history
    const llmResponse = await llmClient.run({
      message,
      history: history || [], // Pass history from client
      tools: Object.values(toolMap)
    });

    // 2. Handle Tool Call - Execute tool and feed result back to LLM
    if (llmResponse.toolCall) {
      const toolName = llmResponse.toolCall.name;
      const tool = toolMap[toolName];
      
      if (!tool) {
        return res.json({ 
          reply: `Error: Tool ${toolName} not found.`,
          history: llmClient.getHistory()
        });
      }

      console.log(`[MCP] Executing tool: ${toolName}`, llmResponse.toolCall.arguments);
      const toolResult = await tool.execute(llmResponse.toolCall.arguments, token);
      
      console.log(`[MCP] Tool result:`, toolResult);
      
      // Feed tool result back to LLM to generate a natural language response
      const finalResponse = await llmClient.continueWithFunctionResponse(toolName, toolResult);

      // Return final response with updated history
      return res.json({ 
        reply: finalResponse.text || `Executed ${toolName} successfully.`,
        data: toolResult,
        history: llmClient.getHistory(),
        toolUsed: toolName
      });
    }

    // 3. Simple text response - return with history for client to maintain context
    return res.json({ 
      reply: llmResponse.text,
      history: llmClient.getHistory()
    });

  } catch (error) {
    console.error('[Chat Route] Error:', error);
    res.status(500).json({ 
      error: 'MCP Error',
      message: error.message 
    });
  }
});

// Endpoint to clear conversation history
router.post('/chat/clear', (req, res) => {
  llmClient.clearHistory();
  res.json({ message: 'Conversation history cleared' });
});

module.exports = router;
