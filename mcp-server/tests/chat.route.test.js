const path = require('path');
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadWithMocks } = require('./helpers/loadWithMocks');

function createResponse() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    }
  };
}

function getChatHandler(router) {
  return router.stack.find(layer => layer.route?.path === '/chat')?.route?.stack?.[0]?.handle;
}

test('chat route supports chained tool calls and injects execution metadata', async () => {
  const toolCalls = [];
  const mockLlmClient = {
    run: async () => ({
      text: null,
      toolCall: { name: 'first_tool', arguments: { value: 1 } }
    }),
    continueWithFunctionResponse: async (name) => {
      if (name === 'first_tool') {
        return {
          text: null,
          toolCall: { name: 'second_tool', arguments: { value: 2 } }
        };
      }
      return { text: '', toolCall: null };
    },
    getHistory: () => [],
    clearHistory: () => {}
  };

  const router = loadWithMocks(path.resolve(__dirname, '../routes/chat.route.js'), {
    '../llm/client': mockLlmClient,
    '../tools': {
      toolMap: {
        first_tool: {
          execute: async args => {
            toolCalls.push({ name: 'first_tool', args });
            return { success: true, message: 'first complete' };
          }
        },
        second_tool: {
          execute: async args => {
            toolCalls.push({ name: 'second_tool', args });
            return { success: true, message: 'second complete' };
          }
        }
      }
    }
  });

  const handler = getChatHandler(router);
  const req = {
    body: {
      message: 'Create then update a task',
      history: [],
      localDate: '2026-04-12',
      localTimeString: '09:15:00 AM',
      userTimezone: 'Asia/Calcutta'
    },
    headers: {
      authorization: 'Bearer test-token'
    }
  };
  const res = createResponse();

  await handler(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.toolChainLength, 2);
  assert.equal(toolCalls.length, 2);
  assert.equal(toolCalls[0].args._meta.localDate, '2026-04-12');
  assert.equal(res.body.reply, 'second complete');
});
