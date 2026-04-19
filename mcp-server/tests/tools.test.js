const path = require('path');
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadWithMocks } = require('./helpers/loadWithMocks');

test('add_subtask uses the current backend route', async () => {
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

test('list_events returns both local and mirrored external events', async () => {
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

test('set_reminder resolves a task query before calling backend reminders route', async () => {
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

test('get_tasks supports limited recent tasks', async () => {
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

test('update_multiple_tasks normalizes date-only today without treating it as past', async () => {
  const calls = [];
  const tool = loadWithMocks(path.resolve(__dirname, '../tools/updateMultipleTasks.tool.js'), {
    axios: {
      patch: async (url, body) => {
        calls.push({ url, body });
        return { data: { title: 'Study ASW' } };
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

test('list_notifications filters unread team invites', async () => {
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

test('respond_team_invite resolves invite by team name and accepts it', async () => {
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
      post: async (url) => {
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

test('copy_task copies a fuzzy matched task to a named team with resolved assignee', async () => {
  const calls = [];
  const tool = loadWithMocks(path.resolve(__dirname, '../tools/copyTask.tool.js'), {
    axios: {
      get: async (url) => {
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

test('create_plan moves today default time forward when it would be in the past', async () => {
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

test('create_plan fails when backend creates no tasks', async () => {
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
