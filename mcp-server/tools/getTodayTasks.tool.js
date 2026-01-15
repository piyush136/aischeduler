const axios = require('axios');

const API_URL = process.env.BACKEND_URL;

const getTodayTasks = {
  name: "get_today_tasks",
  description: "Get all tasks due today",
  parameters: {
    type: "object",
    properties: {},
    required: []
  },
  execute: async (args, token) => {
    try {
      const response = await axios.get(`${API_URL}/tasks/today`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return { success: true, tasks: response.data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
};

module.exports = getTodayTasks;
