const axios = require('axios');

const API_URL = process.env.BACKEND_URL;

const listTeamMembers = {
  name: "list_team_members",
  description: "List all members of a specific team, including their roles, permissions, and invite status. Use list_teams first to get the team_id if needed.",
  parameters: {
    type: "object",
    properties: {
      team_id: {
        type: "string",
        description: "The ID of the team to list members for."
      }
    },
    required: ["team_id"]
  },
  execute: async (args, token) => {
    try {
      const { team_id } = args;
      if (!team_id) return { success: false, error: "team_id is required." };

      console.log(`[MCP] Listing members of team ${team_id}`);

      const response = await axios.get(`${API_URL}/teams/${team_id}/members`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const members = response.data || [];

      if (members.length === 0) {
        return { success: true, message: "This team has no members.", count: 0, members: [] };
      }

      const simplified = members.map(m => ({
        member_id: m._id,
        user_id: m.user_id,
        name: m.name,
        email: m.email,
        role: m.role,
        status: m.status,
        can_add_task: m.can_add_task,
        can_edit_task: m.can_edit_task
      }));

      console.log(`[MCP] Found ${simplified.length} members`);

      return { success: true, count: simplified.length, members: simplified };
    } catch (error) {
      console.error('[MCP] listTeamMembers error:', error.response?.data || error.message);
      return { success: false, error: error.response?.data?.error || error.message };
    }
  }
};

module.exports = listTeamMembers;
