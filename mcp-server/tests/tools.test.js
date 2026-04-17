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
