const axios = require('axios');
const { resolveTaskId } = require('./utils/fuzzyTaskSearch');
const { buildAuthHeaders, getApiErrorMessage } = require('./utils/runtime');

const API_URL = process.env.BACKEND_URL;

const deleteTask = {
  name: 'delete_task',
  description: 'Delete a task by ID or fuzzy task name. If multiple tasks match, the tool returns disambiguation options.',
  parameters: {
    type: 'object',
    properties: {
      task_id: {
        type: 'string',
        description: 'Exact task ID.'
      },
      query: {
        type: 'string',
        description: 'Task name or partial text to resolve.'
      },
      team_id: {
        type: 'string',
        description: 'Optional team ID when resolving a team task.'
      }
    }
  },
  execute: async (args, token) => {
    try {
      let { task_id, query, team_id } = args;
      if (!task_id && !query) {
        return { success: false, error: 'Must provide either task_id or query.' };
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

      const response = await axios.delete(`${API_URL}/tasks/${task_id}`, {
        headers: buildAuthHeaders(token)
      });

      return {
        success: true,
        message: response.data?.message || 'Task deleted successfully.'
      };
    } catch (error) {
      return { success: false, error: getApiErrorMessage(error, 'Failed to delete task.') };
    }
  }
};

module.exports = deleteTask;
