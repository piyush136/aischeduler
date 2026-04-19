const axios = require('axios');
const { buildAuthHeaders, getApiErrorMessage } = require('./utils/runtime');

const { BACKEND_API_URL: API_URL } = require('../config/api');

const deleteSubtask = {
  name: 'delete_subtask',
  description: 'Delete a subtask from a task.',
  parameters: {
    type: 'object',
    properties: {
      task_id: { type: 'string' },
      subtask_id: { type: 'string' }
    },
    required: ['task_id', 'subtask_id']
  },
  execute: async (params, token) => {
    try {
      const response = await axios.delete(
        `${API_URL}/tasks/${params.task_id}/subtasks/${params.subtask_id}`,
        { headers: buildAuthHeaders(token) }
      );

      return {
        success: true,
        message: 'Subtask deleted successfully.',
        task: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: getApiErrorMessage(error, 'Failed to delete subtask.')
      };
    }
  }
};

module.exports = deleteSubtask;
