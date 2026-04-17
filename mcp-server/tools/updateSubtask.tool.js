const axios = require('axios');
const { buildAuthHeaders, getApiErrorMessage } = require('./utils/runtime');

const API_URL = process.env.BACKEND_URL;

const updateSubtask = {
  name: 'update_subtask',
  description: 'Update a subtask status.',
  parameters: {
    type: 'object',
    properties: {
      task_id: { type: 'string' },
      subtask_id: { type: 'string' },
      status: {
        type: 'string',
        enum: ['pending', 'completed']
      }
    },
    required: ['task_id', 'subtask_id', 'status']
  },
  execute: async (params, token) => {
    try {
      const response = await axios.patch(
        `${API_URL}/tasks/${params.task_id}/subtasks/${params.subtask_id}`,
        { status: params.status },
        { headers: buildAuthHeaders(token) }
      );

      return {
        success: true,
        message: `Subtask marked as ${params.status}.`,
        task: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: getApiErrorMessage(error, 'Failed to update subtask.')
      };
    }
  }
};

module.exports = updateSubtask;
