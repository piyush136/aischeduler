const axios = require('axios');

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error('[LLM] ERROR: GEMINI_API_KEY is not set in environment variables');
  throw new Error('GEMINI_API_KEY is required');
}

function getLlmErrorMessage(error) {
  const status = error?.response?.status;
  const retryAfter = error?.response?.headers?.['retry-after'];
  const providerMessage = error?.response?.data?.error?.message || error?.response?.data?.message;

  if (status === 429) {
    const retryHint = retryAfter ? ` Please try again after ${retryAfter} second(s).` : ' Please wait a moment and try again.';
    return `The AI service is rate limited right now.${retryHint}`;
  }

  if (status >= 500) {
    return 'The AI service is temporarily unavailable. Please try again in a moment.';
  }

  if (status === 401 || status === 403) {
    return 'The AI service rejected the API key or permissions. Please check the server configuration.';
  }

  return providerMessage || 'I could not reach the AI service. Please try again.';
}

class LLMClient {
  constructor() {
    this.chatHistory = [];
    this.geminiHistory = [];
    this.activeTools = [];
    this.systemPrompt = '';
  }

  convertHistoryToGemini(history) {
    return history.map(msg => {
      if (msg.role === 'system') return null;

      if (msg.role === 'assistant') {
        const parts = [];
        if (msg.content) parts.push({ text: msg.content });
        if (msg.functionCall) {
          parts.push({
            functionCall: {
              name: msg.functionCall.name,
              args: msg.functionCall.arguments || {}
            }
          });
        }
        if (parts.length === 0) parts.push({ text: '...' });
        return { role: 'model', parts };
      }

      if (msg.role === 'user') {
        return {
          role: 'user',
          parts: [{ text: msg.content || '' }]
        };
      }

      return null;
    }).filter(Boolean);
  }

  normalizeFunctionCall(functionCall) {
    if (!functionCall?.name) return null;

    let args = functionCall.args || functionCall.arguments || {};
    if (typeof args === 'string') {
      try {
        args = JSON.parse(args);
      } catch (error) {
        args = { raw: args };
      }
    }

    return {
      name: functionCall.name,
      arguments: args,
      id: functionCall.name
    };
  }

  trimLeadingModelMessages(messages) {
    const trimmed = [...messages];
    while (trimmed.length > 0 && trimmed[0].role === 'model') {
      trimmed.shift();
    }
    return trimmed;
  }

  extractToolCallFromText(text) {
    if (!text) return null;

    const candidates = [];
    const trimmed = text.trim();

    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      candidates.push(trimmed);
    }

    const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]+?)```/i);
    if (fencedMatch?.[1]) {
      candidates.push(fencedMatch[1].trim());
    }

    for (const candidate of candidates) {
      try {
        const parsed = JSON.parse(candidate);
        const name = parsed.name || parsed.tool || parsed.function;
        const args = parsed.arguments || parsed.args || parsed.parameters || {};
        if (name && this.activeTools.some(tool => tool.name === name)) {
          return this.normalizeFunctionCall({ name, args });
        }
      } catch (error) {
        continue;
      }
    }

    return null;
  }

  convertGeminiToChatHistory(messages) {
    const history = [];

    for (const message of messages) {
      if (!message?.parts?.length) continue;

      if (message.role === 'user') {
        const functionResponse = message.parts.find(part => part.functionResponse);
        if (functionResponse) {
          history.push({
            role: 'user',
            content: `Function ${functionResponse.functionResponse.name} returned: ${JSON.stringify(functionResponse.functionResponse.response)}`
          });
        } else {
          history.push({
            role: 'user',
            content: message.parts.filter(part => part.text).map(part => part.text).join('\n')
          });
        }
      } else if (message.role === 'model') {
        const functionCallPart = message.parts.find(part => part.functionCall);
        history.push({
          role: 'assistant',
          content: message.parts.filter(part => part.text).map(part => part.text).join('\n'),
          functionCall: functionCallPart ? this.normalizeFunctionCall(functionCallPart.functionCall) : undefined
        });
      }
    }

    return history;
  }

  async generateContent(contents) {
    const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
    const payload = {
      contents: this.trimLeadingModelMessages(contents)
    };

    if (this.systemPrompt) {
      payload.systemInstruction = {
        parts: [{ text: this.systemPrompt }]
      };
    }

    if (this.activeTools.length > 0) {
      payload.tools = [{
        functionDeclarations: this.activeTools.map(tool => ({
          name: tool.name,
          description: tool.description,
          parameters: {
            type: tool.parameters.type || 'object',
            properties: tool.parameters.properties || {},
            required: tool.parameters.required || []
          }
        }))
      }];
    }

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      payload,
      {
        params: { key: apiKey },
        headers: { 'Content-Type': 'application/json' }
      }
    );

    const candidates = response.data.candidates || [];
    if (candidates.length === 0) {
      throw new Error('No response from Gemini API');
    }

    const content = candidates[0].content || { role: 'model', parts: [] };
    const parts = content.parts || [];
    const text = parts.filter(part => part.text).map(part => part.text).join('\n').trim();
    const functionCallPart = parts.find(part => part.functionCall);
    const toolCall = functionCallPart
      ? this.normalizeFunctionCall(functionCallPart.functionCall)
      : this.extractToolCallFromText(text);

    return {
      content: {
        role: content.role || 'model',
        parts
      },
      text,
      toolCall
    };
  }

  async run({ message, tools = [], history = [], systemPrompt }) {
    console.log('[LLM] Processing message via Gemini REST API');

    this.activeTools = tools;
    this.systemPrompt = systemPrompt || '';

    const seedHistory = history.length > 0 ? history : this.chatHistory;
    const contents = [
      ...this.convertHistoryToGemini(seedHistory),
      { role: 'user', parts: [{ text: message }] }
    ];

    try {
      const result = await this.generateContent(contents);
      this.geminiHistory = [...this.trimLeadingModelMessages(contents), result.content];
      this.chatHistory = this.convertGeminiToChatHistory(this.geminiHistory);

      return {
        text: result.text || null,
        toolCall: result.toolCall || null
      };
    } catch (error) {
      console.error('[Gemini] Error in run():', error.message);
      console.error('[Gemini] Error response:', error.response?.data);
      return {
        text: getLlmErrorMessage(error),
        toolCall: null
      };
    }
  }

  clearHistory() {
    this.chatHistory = [];
    this.geminiHistory = [];
    this.activeTools = [];
    this.systemPrompt = '';
  }

  getHistory() {
    return this.chatHistory;
  }

  async continueWithFunctionResponse(functionName, functionResult) {
    console.log('[LLM] Continuing conversation with function response');

    const contents = [
      ...this.geminiHistory,
      {
        role: 'user',
        parts: [{
          functionResponse: {
            name: functionName,
            response: functionResult
          }
        }]
      }
    ];

    try {
      const result = await this.generateContent(contents);
      this.geminiHistory = [...this.trimLeadingModelMessages(contents), result.content];
      this.chatHistory = this.convertGeminiToChatHistory(this.geminiHistory);

      return {
        text: result.text || null,
        toolCall: result.toolCall || null
      };
    } catch (error) {
      console.error('[Gemini] Error in continueWithFunctionResponse:', error.message);
      console.error('[Gemini] Error response:', error.response?.data);

      this.geminiHistory = this.trimLeadingModelMessages(contents);
      this.chatHistory = this.convertGeminiToChatHistory(this.geminiHistory);

      return {
        text: functionResult?.message || getLlmErrorMessage(error),
        toolCall: null
      };
    }
  }
}

module.exports = new LLMClient();
