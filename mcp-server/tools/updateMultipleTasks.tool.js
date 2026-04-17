const axios = require('axios');
const { resolveTaskId } = require('./utils/fuzzyTaskSearch');

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
      const { queries, updates } = args;
      const API_URL = process.env.BACKEND_URL || 'http://localhost:5000';

      if (!Array.isArray(queries) || queries.length === 0) {
        return { success: false, error: 'queries array is required and must not be empty.' };
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
          const response = await axios.patch(`${API_URL}/tasks/${task_id}`, updates, {
             headers: { Authorization: `Bearer ${token}` }
          });
          results.updated.push({ query, title: resolved.title, task_id });
        } catch (updateErr) {
          results.failed.push({ query, error: updateErr.message });
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
