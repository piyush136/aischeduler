const axios = require('axios');
const { resolveTaskId } = require('./utils/fuzzyTaskSearch');
const { normalizeDueAt, isPastDue } = require('./utils/dateTime');
const { buildAuthHeaders, getApiErrorMessage } = require('./utils/runtime');
const { BACKEND_API_URL } = require('../config/api');

module.exports = {
  name: 'update_multiple_tasks',
  description: 'Update multiple existing tasks at once (e.g. mark all as completed, reschedule multiple tasks). IMPORTANT: Pass queries as a list of task names or IDs.',
  parameters: {
    type: 'object',
    properties: {
      queries: {
        type: 'array',
        items: { type: 'string' },
        description: 'List of task titles or IDs to update (e.g. ["gym", "meeting", "buy groceries"]). Use "all" if you previously fetched pending tasks and want to update them, in which case you must provide ALL their exact names.'
      },
      updates: {
        type: 'object',
        description: 'Updates to apply to all matched tasks. e.g. { "status": "completed" } or { "due_at": "2024-04-12T10:00:00Z" }'
      }
    },
    required: ['queries', 'updates']
  },
  execute: async (args, token) => {
    try {
      const { queries, updates, _meta = {} } = args;
      const API_URL = BACKEND_API_URL;

      if (!Array.isArray(queries) || queries.length === 0) {
        return { success: false, error: 'queries array is required and must not be empty.' };
      }

      if (!updates || typeof updates !== 'object' || Array.isArray(updates)) {
        return { success: false, error: 'updates object is required.' };
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

      const results = { updated: [], failed: [] };

      // Resolve and update each task sequentially
      for (const query of queries) {
        const resolved = await resolveTaskId(query, token);
        
        if (!resolved.resolved) {
          results.failed.push({ query, error: resolved.message || resolved.error || 'Not found' });
          continue;
        }

        const task_id = resolved.task_id;
        
        try {
          const response = await axios.patch(`${API_URL}/tasks/${task_id}`, normalizedUpdates, {
            headers: buildAuthHeaders(token)
          });
          results.updated.push({ query, title: response.data?.title || resolved.title, task_id, updates: normalizedUpdates });
        } catch (updateErr) {
          results.failed.push({ query, error: getApiErrorMessage(updateErr, 'Failed to update task.') });
        }
      }

      return {
        success: true,
        summary: `Successfully updated ${results.updated.length} tasks. Failed to update ${results.failed.length} tasks.`,
        details: results
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
};
