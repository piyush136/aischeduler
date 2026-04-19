const axios = require('axios');
const { resolveTaskId } = require('./utils/fuzzyTaskSearch');

const { BACKEND_API_URL: API_URL } = require('../config/api');

const pinTask = {
  name: "pin_task",
  description: "Pin or unpin a task. Pinned tasks appear at the top of task lists and are marked as important. Uses fuzzy matching to find tasks by name.",
  parameters: {
    type: "object",
    properties: {
      task_id: {
        type: "string",
        description: "The exact ID of the task to pin/unpin (optional if you provide query)."
      },
      query: {
        type: "string",
        description: "The name/title of the task to pin/unpin (e.g., 'gym', 'meeting'). Supports fuzzy matching and typos."
      },
      pin: {
        type: "boolean",
        description: "Set to true to pin the task, false to unpin. Default is true."
      }
    },
    required: []
  },
  execute: async (args, token) => {
    try {
      let { task_id, query, pin = true } = args;
      if (!task_id && !query) return { success: false, error: "Must provide either task_id or query." };

      // Fuzzy resolve if no task_id
      if (!task_id && query) {
        console.log(`[MCP] pinTask: fuzzy resolving '${query}'`);
        const resolved = await resolveTaskId(query, token);

        if (!resolved.resolved) {
          return {
            success: false,
            ambiguous: resolved.ambiguous || false,
            matches: resolved.matches || [],
            error: resolved.message || resolved.error
          };
        }

        task_id = resolved.task_id;
        console.log(`[MCP] pinTask: Resolved '${query}' → "${resolved.title}" (ID: ${task_id})`);
      }

      const action = pin ? 'Pinning' : 'Unpinning';
      console.log(`[MCP] ${action} task ${task_id}`);

      const response = await axios.patch(`${API_URL}/tasks/${task_id}`, { isPinned: pin }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const task = response.data;
      return {
        success: true,
        message: pin
          ? `📌 Task "${task.title}" has been pinned! It will appear at the top of your task list.`
          : `Task "${task.title}" has been unpinned.`,
        task: {
          task_id: task._id,
          title: task.title,
          isPinned: task.isPinned
        }
      };
    } catch (error) {
      return { success: false, error: error.response?.data?.error || error.message };
    }
  }
};

module.exports = pinTask;
