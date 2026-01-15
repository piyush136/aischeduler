const axios = require('axios');

const API_URL = process.env.BACKEND_URL;

const deleteTask = {
  name: "delete_task",
  description: "Delete a task by its ID. WARNING: This is irreversible.",
  parameters: {
    type: "object",
    properties: {
      task_id: {
        type: "string",
        description: "The unique ID of the task to delete. You MUST get this from 'list_events' or 'get_today_tasks' first."
      }
    },
    required: ["task_id"]
  },
  execute: async (args, token) => {
    try {
      if (!args.task_id) return { success: false, error: "Missing task_id" };

      console.log(`[MCP] Deleting task ${args.task_id}`);

      await axios.delete(`${API_URL}/tasks/${args.task_id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      return { success: true, message: "Task deleted successfully." };

    } catch (error) {
      return { success: false, error: error.message };
    }
  }
};

module.exports = deleteTask;
