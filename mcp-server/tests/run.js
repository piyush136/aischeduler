const assert = require('node:assert/strict');
const path = require('path');
const { normalizeDueAt } = require('../tools/utils/dateTime');
const { scoreTask } = require('../tools/utils/fuzzyTaskSearch');
const { loadWithMocks } = require('./helpers/loadWithMocks');

async function run(name, fn) {
  try {
    await fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    console.error(error);
    process.exitCode = 1;
  }
}

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

(async () => {
  await run('normalizeDueAt handles vague time phrases', async () => {
    const meta = {
      localDate: '2026-04-12',
      localTimeString: '10:00:00 AM'
    };

    const tomorrowMorning = normalizeDueAt('tomorrow morning', meta);
    assert.equal(tomorrowMorning.dueAt, '2026-04-13T09:00:00');
    assert.equal(tomorrowMorning.hasTime, true);

    const later = normalizeDueAt('later', meta);
    assert.equal(later.dueAt, '2026-04-12T18:00:00');
    assert.equal(later.hasTime, true);
  });

  await run('date-only today is not treated as past later in the same day', async () => {
    const { isPastDue } = require('../tools/utils/dateTime');
    const meta = {
      localDate: '2026-04-14',
      localTimeString: '06:30:00 PM'
    };

    assert.equal(isPastDue('2026-04-14T00:00:00', meta, { hasTime: false }), false);
    assert.equal(isPastDue('2026-04-14T00:00:00', meta, { hasTime: true }), true);
  });

  await run('add_task allows date-only today tasks later in the same day', async () => {
    const axiosMock = {
      post: async (url, body) => ({
        data: {
          _id: 'task-today',
          title: body.title,
          due_at: body.due_at,
          has_time: body.has_time
        }
      }),
      get: async () => ({ data: { conflict: false } })
    };

    const tool = loadWithMocks(path.resolve(__dirname, '../tools/addTask.tool.js'), {
      axios: axiosMock
    });

    const result = await tool.execute({
      title: 'Study AWS',
      due_at: 'today',
      _meta: {
        localDate: '2026-04-14',
        localTimeString: '06:30:00 PM'
      }
    }, 'token');

    assert.equal(result.success, true);
    assert.equal(result.extracted.has_time, false);
    assert.equal(result.task.has_time, false);
  });

  await run('add_task explains when a new task has no due date', async () => {
    const tool = loadWithMocks(path.resolve(__dirname, '../tools/addTask.tool.js'), {
      axios: {
        post: async (url, body) => ({
          data: {
            _id: 'task-unscheduled',
            title: body.title
          }
        })
      }
    });

    const result = await tool.execute({
      title: 'Deploy project',
      _meta: {
        localDate: '2026-04-18',
        localTimeString: '07:30:00 PM'
      }
    }, 'token');

    assert.equal(result.success, true);
    assert.match(result.message, /without a due date/i);
    assert.match(result.message, /today tasks/i);
  });

  await run('fuzzy scoring handles typos and word reordering', async () => {
    const typo = scoreTask({ title: 'Gym Workout' }, 'jym');
    assert.ok(typo.score >= 50);

    const reordered = scoreTask({ title: 'Call the dentist' }, 'dentist call');
    assert.ok(reordered.score >= 80);
  });

  await run('add_subtask uses the current backend route', async () => {
    const calls = [];
    const axiosMock = {
      post: async (url, body) => {
        calls.push({ url, body });
        return { data: { ok: true } };
      }
    };

    const tool = loadWithMocks(path.resolve(__dirname, '../tools/addSubtask.tool.js'), {
      axios: axiosMock
    });

    const result = await tool.execute({ task_id: 'task123', title: 'Revision' }, 'token');
    assert.equal(result.success, true);
    assert.equal(calls[0].url.endsWith('/tasks/task123/subtasks'), true);
  });

  await run('list_events returns both local and mirrored external events', async () => {
    const axiosMock = {
      get: async () => ({
        data: {
          connected: true,
          events: [{ id: '1', title: 'Study', start: '2026-04-12T10:00:00Z', source: 'local' }],
          externalEvents: [{ id: '2', title: 'Calendar Meeting', start: '2026-04-12T12:00:00Z', source: 'google' }]
        }
      })
    };

    const tool = loadWithMocks(path.resolve(__dirname, '../tools/listEvents.tool.js'), {
      axios: axiosMock
    });

    const result = await tool.execute({ start_date: 'today', _meta: { localDate: '2026-04-12', localTimeString: '09:00 AM' } }, 'token');
    assert.equal(result.success, true);
    assert.equal(result.count, 2);
    assert.equal(result.externalCount, 1);
  });

  await run('set_reminder resolves a task query before calling backend reminders route', async () => {
    const axiosMock = {
      post: async (url, body) => ({
        data: {
          _id: 'rem1',
          task_id: body.task_id,
          task_title: 'Meeting',
          remind_at: '2026-04-12T14:50:00',
          offset_minutes: 10,
          status: 'scheduled'
        }
      })
    };

    const tool = loadWithMocks(path.resolve(__dirname, '../tools/setReminder.tool.js'), {
      axios: axiosMock,
      './utils/fuzzyTaskSearch': {
        resolveTaskId: async () => ({ resolved: true, task_id: 'task42', title: 'Meeting' })
      }
    });

    const result = await tool.execute({ query: 'meting', offset_minutes: 10 }, 'token');
    assert.equal(result.success, true);
    assert.equal(result.reminder.task_id, 'task42');
  });

  await run('getApiErrorMessage explains HTTP 429 rate limits', async () => {
    const { getApiErrorMessage } = require('../tools/utils/runtime');
    const message = getApiErrorMessage({
      response: {
        status: 429,
        headers: {
          'retry-after': '30'
        }
      },
      message: 'Request failed with status code 429'
    });

    assert.match(message, /too many requests/i);
    assert.match(message, /30/);
    assert.doesNotMatch(message, /Request failed with status code 429/i);
  });

  await run('llm client returns friendly message for Gemini 429 errors', async () => {
    const previousApiKey = process.env.GEMINI_API_KEY;
    process.env.GEMINI_API_KEY = 'test-key';

    const clientPath = path.resolve(__dirname, '../llm/client.js');
    delete require.cache[clientPath];

    try {
      const llmClient = loadWithMocks(clientPath, {
        axios: {
          post: async () => {
            const error = new Error('Request failed with status code 429');
            error.response = {
              status: 429,
              headers: {
                'retry-after': '15'
              },
              data: {
                error: {
                  message: 'Quota exceeded'
                }
              }
            };
            throw error;
          }
        }
      });

      const result = await llmClient.run({ message: 'add task today', tools: [], history: [] });
      assert.match(result.text, /rate limited/i);
      assert.match(result.text, /15/);
      assert.doesNotMatch(result.text, /Request failed with status code 429/i);
    } finally {
      delete require.cache[clientPath];
      if (previousApiKey === undefined) {
        delete process.env.GEMINI_API_KEY;
      } else {
        process.env.GEMINI_API_KEY = previousApiKey;
      }
    }
  });

  await run('update_task summarizes concrete changes', async () => {
    const axiosMock = {
      patch: async () => ({
        data: {
          _id: 'task1',
          title: 'Study AWS',
          priority: 1,
          recurrence: 'DAILY'
        }
      })
    };

    const tool = loadWithMocks(path.resolve(__dirname, '../tools/updateTask.tool.js'), {
      axios: axiosMock
    });

    const result = await tool.execute({
      task_id: 'task1',
      updates: {
        priority: 1,
        recurrence: 'DAILY'
      }
    }, 'token');

    assert.equal(result.success, true);
    assert.match(result.message, /priority to high/i);
    assert.match(result.message, /repeat to daily/i);
  });

  await run('postpone_task can move a task to the next available slot', async () => {
    const calls = [];
    const axiosMock = {
      get: async (url, config) => {
        calls.push({ method: 'get', url, config });
        if (url.endsWith('/tasks')) {
          return {
            data: [
              {
                _id: 'task99',
                title: 'Meeting',
                due_at: '2026-04-12T11:00:00Z',
                duration_minutes: 90
              }
            ]
          };
        }

        if (url.endsWith('/tasks/free-slots')) {
          return {
            data: {
              freeSlots: [
                {
                  start: '2026-04-12T14:00:00.000Z',
                  end: '2026-04-12T16:00:00.000Z',
                  duration: 120
                }
              ]
            }
          };
        }

        throw new Error(`Unexpected GET ${url}`);
      },
      patch: async (url, body) => {
        calls.push({ method: 'patch', url, body });
        return {
          data: {
            _id: 'task99',
            title: 'Meeting',
            due_at: body.new_date
          }
        };
      }
    };

    const tool = loadWithMocks(path.resolve(__dirname, '../tools/postponeTask.tool.js'), {
      axios: axiosMock,
      './utils/fuzzyTaskSearch': {
        resolveTaskId: async () => ({ resolved: true, task_id: 'task99', title: 'Meeting' })
      }
    });

    const result = await tool.execute({
      query: 'meeting',
      new_date: 'next available slot',
      _meta: { localDate: '2026-04-12', localTimeString: '10:00:00 AM' }
    }, 'token');

    assert.equal(result.success, true);
    assert.equal(result.task.due_at, '2026-04-12T14:00:00.000Z');
    const freeSlotCall = calls.find(call => call.url.endsWith('/tasks/free-slots'));
    assert.equal(freeSlotCall.config.params.duration, 90);
  });

  await run('postpone_task allows moving a task to date-only today', async () => {
    const axiosMock = {
      get: async () => ({
        data: [
          {
            _id: 'task-today',
            title: 'Study AWS',
            due_at: '2026-04-11T03:30:00.000Z',
            has_time: false
          }
        ]
      }),
      patch: async (url, body) => ({
        data: {
          _id: 'task-today',
          title: 'Study AWS',
          due_at: body.new_date
        }
      })
    };

    const tool = loadWithMocks(path.resolve(__dirname, '../tools/postponeTask.tool.js'), {
      axios: axiosMock,
      './utils/fuzzyTaskSearch': {
        resolveTaskId: async () => ({ resolved: true, task_id: 'task-today', title: 'Study AWS' })
      }
    });

    const result = await tool.execute({
      query: 'study asw',
      new_date: 'today',
      _meta: { localDate: '2026-04-18', localTimeString: '07:30:00 PM' }
    }, 'token');

    assert.equal(result.success, true);
    assert.equal(result.task.due_at, '2026-04-18T00:00:00');
  });

  await run('get_tasks supports limited recent tasks', async () => {
    const tool = loadWithMocks(path.resolve(__dirname, '../tools/getTodayTasks.tool.js'), {
      axios: {
        get: async () => ({
          data: [
            { _id: 'old', title: 'Old task', status: 'pending', created_at: '2026-04-01T10:00:00.000Z' },
            { _id: 'done', title: 'Done task', status: 'completed', created_at: '2026-04-20T10:00:00.000Z' },
            { _id: 'new', title: 'New task', status: 'pending', created_at: '2026-04-18T10:00:00.000Z' },
            { _id: 'mid', title: 'Middle task', status: 'pending', created_at: '2026-04-12T10:00:00.000Z' }
          ]
        })
      }
    });

    const result = await tool.execute({
      filter: 'recent',
      limit: 2,
      _meta: { localDate: '2026-04-18', localTimeString: '07:30:00 PM' }
    }, 'token');

    assert.equal(result.success, true);
    assert.equal(result.count, 2);
    assert.deepEqual(result.tasks.map(task => task.task_id), ['new', 'mid']);
  });

  await run('update_multiple_tasks normalizes date-only today without treating it as past', async () => {
    const calls = [];
    const tool = loadWithMocks(path.resolve(__dirname, '../tools/updateMultipleTasks.tool.js'), {
      axios: {
        patch: async (url, body) => {
          calls.push({ url, body });
          return { data: { title: 'Study AWS' } };
        }
      },
      './utils/fuzzyTaskSearch': {
        resolveTaskId: async query => ({ resolved: true, task_id: `id-${query}`, title: query })
      }
    });

    const result = await tool.execute({
      queries: ['study asw'],
      updates: { due_at: 'today' },
      _meta: { localDate: '2026-04-18', localTimeString: '07:30:00 PM' }
    }, 'token');

    assert.equal(result.success, true);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].body.due_at, '2026-04-18T00:00:00');
    assert.equal(calls[0].body.has_time, false);
  });

  await run('list_notifications filters unread team invites', async () => {
    const tool = loadWithMocks(path.resolve(__dirname, '../tools/listNotifications.tool.js'), {
      axios: {
        get: async () => ({
          data: [
            {
              _id: 'n1',
              type: 'team_invite',
              message: 'Join Design',
              is_read: false,
              team_id: { _id: 'team1', name: 'Design' }
            },
            {
              _id: 'n2',
              type: 'info',
              message: 'Welcome',
              is_read: false
            }
          ]
        })
      }
    });

    const result = await tool.execute({ filter: 'team_invites' }, 'token');
    assert.equal(result.success, true);
    assert.equal(result.count, 1);
    assert.equal(result.notifications[0].team_name, 'Design');
  });

  await run('respond_team_invite resolves invite by team name and accepts it', async () => {
    const calls = [];
    const tool = loadWithMocks(path.resolve(__dirname, '../tools/respondTeamInvite.tool.js'), {
      axios: {
        get: async () => ({
          data: [
            {
              _id: 'n1',
              type: 'team_invite',
              message: 'Join Design',
              is_read: false,
              team_id: { _id: 'team1', name: 'Design' }
            }
          ]
        }),
        post: async url => {
          calls.push(url);
          return { data: { message: 'Invite accepted' } };
        }
      }
    });

    const result = await tool.execute({ action: 'accept', team_name: 'design' }, 'token');
    assert.equal(result.success, true);
    assert.equal(result.team_id, 'team1');
    assert.equal(calls[0].endsWith('/teams/team1/accept-invite'), true);
  });

  await run('copy_task copies a fuzzy matched task to a named team with resolved assignee', async () => {
    const calls = [];
    const tool = loadWithMocks(path.resolve(__dirname, '../tools/copyTask.tool.js'), {
      axios: {
        get: async url => {
          if (url.endsWith('/teams')) {
            return { data: [{ _id: 'team1', name: 'Design' }] };
          }
          if (url.endsWith('/teams/team1/members')) {
            return { data: [{ user_id: 'user1', name: 'Asha', email: 'asha@example.com' }] };
          }
          throw new Error(`Unexpected GET ${url}`);
        },
        post: async (url, body) => {
          calls.push({ url, body });
          return { data: { _id: 'copy1', title: 'Prepare brief' } };
        }
      },
      './utils/fuzzyTaskSearch': {
        resolveTaskId: async () => ({ resolved: true, task_id: 'task1', title: 'Prepare brief' })
      }
    });

    const result = await tool.execute({
      query: 'brief',
      direction: 'to_team',
      team_name: 'Design',
      assignee_queries: ['asha']
    }, 'token');

    assert.equal(result.success, true);
    assert.equal(calls[0].url.endsWith('/tasks/task1/copy-team'), true);
    assert.deepEqual(calls[0].body.assigned_to, ['user1']);
  });

  await run('create_plan moves today default time forward when it would be in the past', async () => {
    const calls = [];
    const tool = loadWithMocks(path.resolve(__dirname, '../tools/createPlan.tool.js'), {
      axios: {
        post: async (url, body) => {
          calls.push({ url, body });
          return {
            data: {
              tasks: body.tasks.map((task, index) => ({ ...task, _id: `task${index + 1}` }))
            }
          };
        }
      }
    });

    const result = await tool.execute({
      goal: 'Exam preparation',
      num_days: 2,
      tasks: [{ title: 'Review concepts' }, { title: 'Solve papers' }],
      _meta: { localDate: '2026-04-19', localTimeString: '06:30:00 PM' }
    }, 'token');

    assert.equal(result.success, true);
    assert.equal(calls[0].body.tasks[0].due_at, '2026-04-19T19:30:00');
    assert.equal(calls[0].body.tasks[1].due_at, '2026-04-20T09:00:00');
  });

  await run('create_plan fails when backend creates no tasks', async () => {
    const tool = loadWithMocks(path.resolve(__dirname, '../tools/createPlan.tool.js'), {
      axios: {
        post: async () => ({
          data: {
            summary: { created: 0, failed: 1 },
            tasks: [],
            errors: [{ title: 'Review concepts', error: 'Tasks cannot be scheduled in the past' }]
          }
        })
      }
    });

    const result = await tool.execute({
      goal: 'Exam preparation',
      tasks: [{ title: 'Review concepts' }],
      _meta: { localDate: '2026-04-19', localTimeString: '06:30:00 PM' }
    }, 'token');

    assert.equal(result.success, false);
    assert.match(result.error, /No plan tasks were created/i);
  });

  await run('chat route supports chained tool calls and injects execution metadata', async () => {
    const toolCalls = [];
    const mockLlmClient = {
      run: async () => ({
        text: null,
        toolCall: { name: 'first_tool', arguments: { value: 1 } }
      }),
      continueWithFunctionResponse: async name => {
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

  await run('chat route removes duplicate current user turn from incoming history', async () => {
    let capturedHistory = null;
    const mockLlmClient = {
      run: async ({ history }) => {
        capturedHistory = history;
        return { text: 'ok', toolCall: null };
      },
      continueWithFunctionResponse: async () => ({ text: 'ok', toolCall: null }),
      getHistory: () => [],
      clearHistory: () => {}
    };

    const router = loadWithMocks(path.resolve(__dirname, '../routes/chat.route.js'), {
      '../llm/client': mockLlmClient,
      '../tools': { toolMap: {} }
    });

    const handler = getChatHandler(router);
    const req = {
      body: {
        message: 'Show my tasks',
        history: [
          { role: 'assistant', content: 'Hi' },
          { role: 'user', content: 'Show my tasks' }
        ],
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
    assert.equal(capturedHistory.length, 1);
    assert.equal(capturedHistory[0].role, 'assistant');
  });

  await run('chat route handles past task requests without calling Gemini', async () => {
    let llmCalled = false;
    let capturedArgs = null;
    const mockLlmClient = {
      run: async () => {
        llmCalled = true;
        return { text: 'should not run', toolCall: null };
      },
      continueWithFunctionResponse: async () => ({ text: 'should not run', toolCall: null }),
      getHistory: () => [],
      clearHistory: () => {}
    };

    const router = loadWithMocks(path.resolve(__dirname, '../routes/chat.route.js'), {
      '../llm/client': mockLlmClient,
      '../tools': {
        toolMap: {
          get_tasks: {
            execute: async args => {
              capturedArgs = args;
              return {
                success: true,
                filter: 'overdue',
                count: 1,
                tasks: [{ title: 'Submit report' }],
                message: 'Found 1 overdue task.'
              };
            }
          }
        }
      }
    });

    const handler = getChatHandler(router);
    const req = {
      body: {
        message: 'tell me past task',
        history: [],
        localDate: '2026-05-18',
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
    assert.equal(llmCalled, false);
    assert.equal(res.body.directIntent, true);
    assert.equal(res.body.toolUsed, 'get_tasks');
    assert.equal(res.body.reply, 'Found 1 overdue task.');
    assert.equal(capturedArgs.filter, 'overdue');
    assert.equal(capturedArgs._meta.localDate, '2026-05-18');
  });

  if (process.exitCode) {
    process.exit(process.exitCode);
  }
})();
