const axios = require('axios');
const { normalizeDueAt, isPastDue } = require('./utils/dateTime');
const { buildAuthHeaders, getApiErrorMessage } = require('./utils/runtime');

const { BACKEND_API_URL: API_URL } = require('../config/api');

const addMultipleTasks = {
  name: 'add_multiple_tasks',
  description: 'Create multiple tasks at once with validation, date parsing, and conflict detection.',
  parameters: {
    type: 'object',
    properties: {
      tasks: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            due_at: { type: 'string' },
            priority: { type: 'integer' },
            recurrence: { type: 'string' },
            description: { type: 'string' }
          },
          required: ['title']
        }
      },
      force: {
        type: 'boolean',
        default: false
      }
    },
    required: ['tasks']
  },
  async execute(args, token) {
    try {
      const { _meta = {}, tasks = [], force = false } = args;
      if (!Array.isArray(tasks) || tasks.length === 0) {
        return { success: false, error: 'tasks must be a non-empty array.' };
      }

      const tasksToCreate = [];
      const validationErrors = [];

      for (let index = 0; index < tasks.length; index += 1) {
        const task = tasks[index];
        const normalizedDate = normalizeDueAt(task.due_at, _meta);
        if (task.due_at && !normalizedDate.dueAt) {
          validationErrors.push({ index, title: task.title, error: normalizedDate.error || 'Invalid date format' });
          continue;
        }

        if (normalizedDate.dueAt && isPastDue(normalizedDate.dueAt, _meta, { hasTime: normalizedDate.hasTime })) {
          validationErrors.push({ index, title: task.title, error: 'Cannot create a task in the past' });
          continue;
        }

        if (normalizedDate.dueAt && normalizedDate.hasTime && !force) {
          try {
            const conflictRes = await axios.get(`${API_URL}/tasks/check-conflict`, {
              params: { startTime: normalizedDate.dueAt },
              headers: buildAuthHeaders(token)
            });
            if (conflictRes.data.conflict) {
              validationErrors.push({
                index,
                title: task.title,
                conflict: true,
                error: conflictRes.data.message
              });
              continue;
            }
          } catch (error) {
            console.error('[addMultipleTasks] Conflict check failed:', error.message);
          }
        }

        tasksToCreate.push({
          title: task.title,
          description: task.description || undefined,
          due_at: normalizedDate.dueAt || undefined,
          has_time: task.due_at ? normalizedDate.hasTime : false,
          priority: Number.isFinite(task.priority) ? task.priority : 3,
          recurrence: task.recurrence || 'NONE'
        });
      }

      if (tasksToCreate.length === 0) {
        return { success: false, error: 'No valid tasks to create.', validationErrors };
      }

      const response = await axios.post(`${API_URL}/tasks/bulk`, { tasks: tasksToCreate }, {
        headers: buildAuthHeaders(token)
      });

      return {
        success: true,
        summary: response.data.summary,
        tasks: response.data.tasks,
        validationErrors: validationErrors.length > 0 ? validationErrors : undefined
      };
    } catch (error) {
      return { success: false, error: getApiErrorMessage(error, 'Failed to create tasks.') };
    }
  }
};

module.exports = addMultipleTasks;
