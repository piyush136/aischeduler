const axios = require('axios');
const { buildAuthHeaders, getApiErrorMessage } = require('./utils/runtime');

const { BACKEND_API_URL: API_URL } = require('../config/api');

const addSubtask = {
  name: 'add_subtask',
  description: 'Add a subtask to an existing task.',
  parameters: {
    type: 'object',
    properties: {
      task_id: {
        type: 'string',
        description: 'Parent task ID.'
      },
      title: {
        type: 'string',
        description: 'Subtask title.'
      }
    },
    required: ['task_id', 'title']
  },
  execute: async (params, token) => {
    try {
      const response = await axios.post(
        `${API_URL}/tasks/${params.task_id}/subtasks`,
        { title: params.title },
        { headers: buildAuthHeaders(token) }
      );

      return {
        success: true,
        message: `Subtask "${params.title}" added successfully.`,
        task: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: getApiErrorMessage(error, 'Failed to add subtask.')
      };
    }
  }
};

module.exports = addSubtask;
