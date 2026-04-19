const axios = require('axios');

const { BACKEND_API_URL: API_URL } = require('../config/api');

const removeTeamMember = {
  name: "remove_team_member",
  description: "Remove a member from a team. Only team admins can remove members. Use list_team_members first to get the member_id.",
  parameters: {
    type: "object",
    properties: {
      team_id: {
        type: "string",
        description: "The ID of the team."
      },
      member_id: {
        type: "string",
        description: "The membership ID (_id) of the member to remove. Get this from list_team_members."
      }
    },
    required: ["team_id", "member_id"]
  },
  execute: async (args, token) => {
    try {
      const { team_id, member_id } = args;
      if (!team_id) return { success: false, error: "team_id is required." };
      if (!member_id) return { success: false, error: "member_id is required." };

      console.log(`[MCP] Removing member ${member_id} from team ${team_id}`);

      await axios.delete(`${API_URL}/teams/${team_id}/members/${member_id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log('[MCP] Member removed successfully');

      return {
        success: true,
        message: "Member removed from the team successfully."
      };
    } catch (error) {
      console.error('[MCP] removeTeamMember error:', error.response?.data || error.message);
      return { success: false, error: error.response?.data?.error || error.message };
    }
  }
};

module.exports = removeTeamMember;
