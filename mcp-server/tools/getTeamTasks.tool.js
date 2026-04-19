const axios = require('axios');

const { BACKEND_API_URL: API_URL } = require('../config/api');

const getTeamTasks = {
  name: "get_team_tasks",
  description: "Get all tasks for a specific team. Returns tasks assigned to anyone in the team or created by the user. Use list_teams first to get the team_id if needed.",
  parameters: {
    type: "object",
    properties: {
      team_id: {
        type: "string",
        description: "The ID of the team to get tasks for."
      }
    },
    required: ["team_id"]
  },
  execute: async (args, token) => {
    try {
      const { team_id } = args;
      if (!team_id) return { success: false, error: "team_id is required." };

      console.log(`[MCP] Fetching tasks for team ${team_id}`);

      const response = await axios.get(`${API_URL}/teams/${team_id}/tasks`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const tasks = response.data || [];

      if (tasks.length === 0) {
        return { success: true, message: "No tasks found for this team.", count: 0, tasks: [] };
      }

      // Return simplified task objects to save tokens
      const simplified = tasks.map(t => ({
        task_id: t._id,
        title: t.title,
        status: t.status,
        priority: t.priority,
        due_at: t.due_at,
        assigned_to: t.assigned_to,
        created_by: t.created_by
      }));

      console.log(`[MCP] Found ${simplified.length} team tasks`);

      return { success: true, count: simplified.length, tasks: simplified };
    } catch (error) {
      console.error('[MCP] getTeamTasks error:', error.response?.data || error.message);
      return { success: false, error: error.response?.data?.error || error.message };
    }
  }
};

module.exports = getTeamTasks;
