const axios = require('axios');
const { resolveTaskId } = require('./utils/fuzzyTaskSearch');
const { normalizeDueAt } = require('./utils/dateTime');
const { buildAuthHeaders, getApiErrorMessage } = require('./utils/runtime');

const { BACKEND_API_URL: API_URL } = require('../config/api');

const setReminder = {
  name: 'set_reminder',
  description: 'Set or update a reminder for a task. Supports fuzzy task matching and offset-based reminders like 10 minutes before.',
  parameters: {
    type: 'object',
    properties: {
      task_id: { type: 'string' },
      query: { type: 'string' },
      remind_at: {
        type: 'string',
        description: 'Optional absolute reminder time.'
      },
      offset_minutes: {
        type: 'number',
        description: 'Optional offset in minutes before the task due time.'
      }
    }
  },
  execute: async (args, token) => {
    try {
      const { _meta = {} } = args;
      let { task_id, query, remind_at, offset_minutes } = args;

      if (!task_id && !query) {
        return { success: false, error: 'Must provide either task_id or query.' };
      }

      if (!task_id && query) {
        const resolved = await resolveTaskId(query, token, { statusFilter: 'all' });
        if (!resolved.resolved) {
          return {
            success: false,
            ambiguous: resolved.ambiguous || false,
            matches: resolved.matches || [],
            error: resolved.message || resolved.error
          };
        }
        task_id = resolved.task_id;
      }

      let remindAt = remind_at;
      if (remind_at) {
        const normalized = normalizeDueAt(remind_at, _meta);
        if (!normalized.dueAt) {
          return { success: false, error: normalized.error || `Could not understand "${remind_at}".` };
        }
        remindAt = normalized.dueAt;
      }

      const response = await axios.post(`${API_URL}/reminders`, {
        task_id,
        remind_at: remindAt,
        offset_minutes
      }, {
        headers: buildAuthHeaders(token)
      });

      return {
        success: true,
        reminder: response.data,
        message: `Reminder set for "${response.data.task_title}".`
      };
    } catch (error) {
      return { success: false, error: getApiErrorMessage(error, 'Failed to set reminder.') };
    }
  }
};

module.exports = setReminder;
