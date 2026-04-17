const axios = require('axios');

const API_URL = process.env.BACKEND_URL;

const deleteTeam = {
  name: "delete_team",
  description: "Delete a team permanently. Only team admins can delete a team. This removes all members and team tasks. Use list_teams first to get the team_id.",
  parameters: {
    type: "object",
    properties: {
      team_id: {
        type: "string",
        description: "The ID of the team to delete."
      }
    },
    required: ["team_id"]
  },
  execute: async (args, token) => {
    try {
      const { team_id } = args;
      if (!team_id) return { success: false, error: "team_id is required." };

      console.log(`[MCP] Deleting team ${team_id}`);

      await axios.delete(`${API_URL}/teams/${team_id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log('[MCP] Team deleted successfully');

      return {
        success: true,
        message: "Team deleted successfully. All members and team tasks have been removed."
      };
    } catch (error) {
      console.error('[MCP] deleteTeam error:', error.response?.data || error.message);
      return { success: false, error: error.response?.data?.error || error.message };
    }
  }
};

module.exports = deleteTeam;
