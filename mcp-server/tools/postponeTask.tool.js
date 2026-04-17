const axios = require('axios');
const { resolveTaskId } = require('./utils/fuzzyTaskSearch');
const { normalizeDueAt, isPastDue } = require('./utils/dateTime');
const { buildAuthHeaders, getApiErrorMessage } = require('./utils/runtime');

const API_URL = process.env.BACKEND_URL;

function isNextAvailableRequest(value = '') {
  const normalized = String(value).toLowerCase().trim();
  return /next\s+(available|free)\s+slot/.test(normalized) || /next\s+slot/.test(normalized) || /free\s+time/.test(normalized);
}

function inferSearchDate(requestText, task, meta) {
  const requestedDate = normalizeDueAt(requestText, meta);
  if (requestedDate?.dueAt) {
    return requestedDate.dueAt.slice(0, 10);
  }

  if (task?.due_at) {
    return new Date(task.due_at).toISOString().slice(0, 10);
  }

  return meta.localDate || new Date().toISOString().slice(0, 10);
}

async function fetchTaskById(taskId, token) {
  const response = await axios.get(`${API_URL}/tasks`, {
    headers: buildAuthHeaders(token)
  });

  return (response.data || []).find(task => String(task._id) === String(taskId)) || null;
}

const postponeTask = {
  name: 'postpone_task',
  description: 'Postpone or reschedule an incomplete task to a future date. Also supports requests like "next available slot" or "free time".',
  parameters: {
    type: 'object',
    properties: {
      task_id: { type: 'string' },
      query: { type: 'string' },
      team_id: { type: 'string' },
      new_date: {
        type: 'string',
        description: 'New date or date/time phrase such as "tomorrow evening" or "next Monday".'
      },
      duration: {
        type: 'number',
        description: 'Optional desired duration in minutes when searching for a free slot.'
      }
    },
    required: ['new_date']
  },
  execute: async (args, token) => {
    try {
      const { _meta = {} } = args;
      let { task_id, query, team_id, new_date, duration } = args;
      if (!task_id && !query) return { success: false, error: 'Must provide either task_id or query.' };

      if (!task_id && query) {
        const resolved = await resolveTaskId(query, token, team_id ? { scope: 'team', teamId: team_id, statusFilter: 'pending' } : { statusFilter: 'pending' });
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

      const task = await fetchTaskById(task_id, token);
      if (!task) {
        return { success: false, error: 'Task not found.' };
      }

      let targetDueAt = null;

      if (isNextAvailableRequest(new_date)) {
        const searchDate = inferSearchDate(new_date, task, _meta);
        const slotDuration = Number(duration) || Number(task.duration_minutes) || 60;
        const freeSlotResponse = await axios.get(`${API_URL}/tasks/free-slots`, {
          params: { date: searchDate, duration: slotDuration },
          headers: buildAuthHeaders(token)
        });

        const slots = freeSlotResponse.data?.freeSlots || [];
        if (!slots.length) {
          return {
            success: false,
            error: `No free slot of ${slotDuration} minutes was found on ${searchDate}.`
          };
        }

        targetDueAt = slots[0].start;
      } else {
        const normalizedDate = normalizeDueAt(new_date, _meta);
        if (!normalizedDate.dueAt) {
          return { success: false, error: normalizedDate.error || `Could not understand "${new_date}".` };
        }
        if (isPastDue(normalizedDate.dueAt, _meta)) {
          return { success: false, error: 'Cannot postpone a task into the past.' };
        }
        targetDueAt = normalizedDate.dueAt;
      }

      const response = await axios.patch(`${API_URL}/tasks/${task_id}/postpone`, { new_date: targetDueAt }, {
        headers: buildAuthHeaders(token)
      });

      return {
        success: true,
        task: response.data,
        message: `Task "${response.data.title}" has been postponed to ${new Date(response.data.due_at).toLocaleString()}.`
      };
    } catch (error) {
      return { success: false, error: getApiErrorMessage(error, 'Failed to postpone task.') };
    }
  }
};

module.exports = postponeTask;
