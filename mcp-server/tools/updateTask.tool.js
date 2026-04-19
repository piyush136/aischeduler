const axios = require('axios');
const { resolveTaskId } = require('./utils/fuzzyTaskSearch');
const { normalizeDueAt, isPastDue } = require('./utils/dateTime');
const {
  buildAuthHeaders,
  ensureArray,
  getApiErrorMessage
} = require('./utils/runtime');

const { BACKEND_API_URL: API_URL } = require('../config/api');

function formatPriority(priority) {
  if (priority === 1) return 'high';
  if (priority === 2) return 'high';
  if (priority === 3) return 'normal';
  if (priority === 4 || priority === 5) return 'low';
  return String(priority);
}

function formatRecurrence(recurrence) {
  if (!recurrence || recurrence === 'NONE') return 'no repeat';
  return recurrence.toLowerCase().replace(/_/g, ' ');
}

function summarizeUpdate(task, updates) {
  const changes = [];

  if (updates.title !== undefined) changes.push(`title to "${task.title}"`);
  if (updates.priority !== undefined) changes.push(`priority to ${formatPriority(task.priority)}`);
  if (updates.status !== undefined) changes.push(`status to ${task.status}`);
  if (updates.isPinned !== undefined) changes.push(task.isPinned ? 'pinned it' : 'unpinned it');
  if (updates.recurrence !== undefined) changes.push(`repeat to ${formatRecurrence(task.recurrence)}`);
  if (updates.due_at !== undefined) changes.push(`time to ${task.due_at}`);
  if (updates.assigned_to !== undefined) changes.push('assignment');

  if (changes.length === 0) {
    return `Task "${task.title}" updated successfully.`;
  }

  return `Updated "${task.title}": ${changes.join(', ')}.`;
}

const updateTask = {
  name: 'update_task',
  description: 'Update, reschedule, assign, or complete a task. Supports fuzzy matching by query and safer date normalization.',
  parameters: {
    type: 'object',
    properties: {
      task_id: {
        type: 'string',
        description: 'Exact task ID.'
      },
      query: {
        type: 'string',
        description: 'Task name or partial text to resolve with fuzzy matching.'
      },
      team_id: {
        type: 'string',
        description: 'Optional team ID when resolving a team task by query.'
      },
      updates: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          due_at: { type: 'string' },
          has_time: { type: 'boolean' },
          status: { type: 'string', enum: ['pending', 'in_progress', 'completed'] },
          priority: { type: 'number' },
          recurrence: { type: 'string' },
          recurrence_end_date: { type: 'string' },
          team_id: { type: 'string' },
          assigned_to: {
            type: 'array',
            items: { type: 'string' }
          },
          duration_minutes: { type: 'number' },
          tags: {
            type: 'array',
            items: { type: 'string' }
          }
        },
        required: []
      }
    },
    required: ['updates']
  },
  execute: async (args, token) => {
    try {
      const { _meta = {} } = args;
      let { task_id, query, updates, team_id } = args;

      if (!task_id && !query) {
        return { success: false, error: 'Must provide either task_id or query.' };
      }

      if (!updates || typeof updates !== 'object' || Array.isArray(updates)) {
        return { success: false, error: 'Missing updates object.' };
      }

      if (!task_id && query) {
        const resolved = await resolveTaskId(query, token, team_id ? { scope: 'team', teamId: team_id, statusFilter: 'all' } : { statusFilter: 'all' });
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

      const normalizedUpdates = { ...updates };
      if (normalizedUpdates.due_at !== undefined) {
        const normalizedDate = normalizeDueAt(normalizedUpdates.due_at, _meta);
        if (!normalizedDate.dueAt) {
          return { success: false, error: normalizedDate.error || `Could not understand "${normalizedUpdates.due_at}".` };
        }
        const nextHasTime = normalizedUpdates.has_time === undefined ? normalizedDate.hasTime : normalizedUpdates.has_time;
        if (isPastDue(normalizedDate.dueAt, _meta, { hasTime: nextHasTime })) {
          return { success: false, error: 'Updated due time cannot be in the past.' };
        }
        normalizedUpdates.due_at = normalizedDate.dueAt;
        if (normalizedUpdates.has_time === undefined) {
          normalizedUpdates.has_time = normalizedDate.hasTime;
        }
      }

      if (normalizedUpdates.assigned_to !== undefined) {
        normalizedUpdates.assigned_to = ensureArray(normalizedUpdates.assigned_to).filter(Boolean);
      }

      const response = await axios.patch(`${API_URL}/tasks/${task_id}`, normalizedUpdates, {
        headers: buildAuthHeaders(token)
      });

      return {
        success: true,
        task: response.data,
        message: summarizeUpdate(response.data, normalizedUpdates)
      };
    } catch (error) {
      return { success: false, error: getApiErrorMessage(error, 'Failed to update task.') };
    }
  }
};

module.exports = updateTask;
