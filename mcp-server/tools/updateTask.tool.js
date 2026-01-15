const axios = require('axios');

const API_URL = process.env.BACKEND_URL;

const updateTask = {
  name: "update_task",
  description: "Update or reschedule a task. You can change title, due_at, status, etc.",
  parameters: {
    type: "object",
    properties: {
      task_id: {
        type: "string",
        description: "The unique ID of the task to update. MUST obtained via 'list_events'."
      },
      updates: {
        type: "object",
        description: "Fields to update",
        properties: {
          title: { type: "string" },
          due_at: { type: "string", description: "ISO-8601 date string" },
          status: { type: "string", enum: ["pending", "completed"] },
          priority: { type: "number" }
        }
      }
    },
    required: ["task_id", "updates"]
  },
  execute: async (args, token) => {
    try {
      const { task_id, updates } = args;
      if (!task_id || !updates) return { success: false, error: "Missing task_id or updates" };

      // Fix date if provided
      if (updates.due_at) {
          if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(updates.due_at)) {
             const now = new Date();
             const [hours, minutes, seconds] = updates.due_at.split(':').map(Number);
             now.setHours(hours, minutes, seconds || 0, 0);
             updates.due_at = now.toISOString();
          }
      }

      console.log(`[MCP] Updating task ${task_id}`, updates);

      const response = await axios.put(`${API_URL}/tasks/${task_id}`, updates, {
        headers: { Authorization: `Bearer ${token}` }
      });

      return { success: true, task: response.data };

    } catch (error) {
      return { success: false, error: error.message };
    }
  }
};

module.exports = updateTask;
