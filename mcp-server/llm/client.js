const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY);

class LLMClient {
  constructor() {
    this.chatHistory = []; // Maintain conversation history
  }

  // Convert history format from OpenAI format to Gemini format
  convertHistoryToGemini(history) {
    return history.map(msg => {
      if (msg.role === 'system') {
        // Gemini doesn't support system messages directly, so we'll prepend to user messages
        return null; // Filter these out
      }
      if (msg.role === 'assistant') {
        return {
          role: 'model',
          parts: [{ text: msg.content || '' }]
        };
      }
      if (msg.role === 'user') {
        return {
          role: 'user',
          parts: [{ text: msg.content || '' }]
        };
      }
      return null;
    }).filter(msg => msg !== null);
  }

  // Convert Gemini function calls to our format
  convertGeminiFunctionCall(functionCall) {
    if (!functionCall || !functionCall.name) return null;
    
    return {
      name: functionCall.name,
      arguments: functionCall.args || {},
      id: functionCall.name // Gemini doesn't provide IDs, so we use the name
    };
  }

  async run({ message, tools, history = [], systemPrompt }) {
    console.log('[LLM] Processing message via Gemini API');
    
    // Get or create model
    const model = genAI.getGenerativeModel({ 
      model: process.env.GEMINI_MODEL || 'gemini-1.0-pro',
    });

    // Format tools for Gemini API (function declarations)
    const functionDeclarations = tools.map(tool => ({
      name: tool.name,
      description: tool.description,
      parameters: {
        type: tool.parameters.type || 'object',
        properties: tool.parameters.properties || {},
        required: tool.parameters.required || []
      }
    }));

    // Merge external history with internal history
    const allHistory = [...this.chatHistory, ...history];
    
    // Convert history to Gemini format
    let geminiHistory = this.convertHistoryToGemini(allHistory);

    // Ensure history doesn't start with 'model' role (Gemini requirement: must start with 'user')
    if (geminiHistory.length > 0 && geminiHistory[0].role === 'model') {
      // Remove leading model messages until we find a user message or reach the end
      while (geminiHistory.length > 0 && geminiHistory[0].role === 'model') {
        geminiHistory = geminiHistory.slice(1);
      }
    }

    // Start chat with history (without systemInstruction to avoid API errors)
    const chat = model.startChat({
      history: geminiHistory.length > 0 ? geminiHistory : [],
      tools: functionDeclarations.length > 0 ? [{ functionDeclarations }] : undefined
    });

    try {
      // Send message directly without enhancement
      const result = await chat.sendMessage(message);
      const response = result.response;

      // Update internal history with user message and assistant response
      this.chatHistory.push({
        role: 'user',
        content: message
      });

      // Check for function calls
      const functionCalls = response.functionCalls();
      
      if (functionCalls && functionCalls.length > 0) {
        const functionCall = functionCalls[0];
        const toolCall = this.convertGeminiFunctionCall(functionCall);
        
        // Add assistant response with function call to history
        this.chatHistory.push({
          role: 'assistant',
          content: response.text() || '',
          functionCall: toolCall
        });

        console.log('[LLM] Function call detected:', toolCall.name);
        
        return {
          text: response.text() || null,
          toolCall: toolCall
        };
      }

      // Handle text response
      const responseText = response.text();
      
      // Add assistant response to history
      this.chatHistory.push({
        role: 'assistant',
        content: responseText
      });

      return {
        text: responseText,
        toolCall: null
      };

    } catch (error) {
      console.error('[Gemini] Error in run():', error.message);
      console.error('[Gemini] Error stack:', error.stack);
      return {
        text: `Error: ${error.message}`,
        toolCall: null
      };
    }
  }

  // Method to clear conversation history
  clearHistory() {
    this.chatHistory = [];
  }

  // Method to get current history
  getHistory() {
    return this.chatHistory;
  }

  // Method to continue conversation after function execution
  async continueWithFunctionResponse(functionName, functionResult) {
    console.log('[LLM] Continuing conversation with function response');
    
    const model = genAI.getGenerativeModel({ 
      model: process.env.GEMINI_MODEL || 'gemini-1.5-pro',
    });

    // Convert history to Gemini format
    let geminiHistory = this.convertHistoryToGemini(this.chatHistory);

    // Ensure history doesn't start with 'model' role (Gemini requirement: must start with 'user')
    if (geminiHistory.length > 0 && geminiHistory[0].role === 'model') {
      // Remove leading model messages until we find a user message or reach the end
      while (geminiHistory.length > 0 && geminiHistory[0].role === 'model') {
        geminiHistory = geminiHistory.slice(1);
      }
    }

    // Start chat with existing history
    const chat = model.startChat({
      history: geminiHistory.length > 0 ? geminiHistory : []
    });

    try {
      // Send function response in the correct Gemini format
      // The function response should be sent as a Part with functionResponse
      const result = await chat.sendMessage({
        parts: [{
          functionResponse: {
            name: functionName,
            response: functionResult
          }
        }]
      });
      
      const response = result.response;
      const responseText = response.text();

      // Update history: add function response (as user message) and model's final response
      // Add function response to history
      this.chatHistory.push({
        role: 'user',
        content: `Function ${functionName} returned: ${JSON.stringify(functionResult)}`
      });

      // Add the model's final response
      this.chatHistory.push({
        role: 'assistant',
        content: responseText
      });

      return {
        text: responseText,
        toolCall: null
      };

    } catch (error) {
      console.error('[Gemini] Error in continueWithFunctionResponse:', error.message);
      console.error('[Gemini] Error stack:', error.stack);
      // Fallback: return a simple message
      const fallbackText = `I've executed ${functionName}. ${JSON.stringify(functionResult)}`;
      
      // Still update history with fallback
      this.chatHistory.push({
        role: 'user',
        content: `Function ${functionName} returned: ${JSON.stringify(functionResult)}`
      });
      this.chatHistory.push({
        role: 'assistant',
        content: fallbackText
      });
      
      return {
        text: fallbackText,
        toolCall: null
      };
    }
  }
}

module.exports = new LLMClient();
