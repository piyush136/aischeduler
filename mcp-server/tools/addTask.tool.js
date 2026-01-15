const axios = require('axios');

const API_URL = process.env.BACKEND_URL;

const addTask = {
  name: "add_task",
  description: "Create a new task for the user",
  parameters: {
    type: "object",
    properties: {
      title: {
        type: "string",
        description: "The title of the task"
      },
      due_at: {
        type: "string",
        description: "ISO-8601 datetime string for when the task is due"
      },
      priority: {
        type: "number",
        description: "Priority level (1-5, default 3)"
      },
      recurrence: {
        type: "string",
        enum: ["DAILY", "WEEKLY", "MONTHLY"],
        description: "Recurrence rule for the task (e.g., DAILY for everyday)"
      }
    },
    required: ["title"]
  },
  execute: async (args, token) => {
    try {
      // Validate/Fix Date
      let dueAt = args.due_at;
      if (dueAt) {
          // Check if it's just a time string (e.g., "06:00" or "06:00:00")
          if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(dueAt)) {
             const now = new Date();
             const [hours, minutes, seconds] = dueAt.split(':').map(Number);
             now.setHours(hours, minutes, seconds || 0, 0);
             dueAt = now.toISOString();
             args.due_at = dueAt; // Update args
          }
      }

      const response = await axios.post(`${API_URL}/tasks`, args, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return { success: true, task: response.data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
};

module.exports = addTask;
