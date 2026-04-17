const axios = require('axios');

const API_URL = process.env.BACKEND_URL;

const inviteTeamMember = {
  name: "invite_team_member",
  description: "Invite a user to join a team by their email address. The invited user will receive a notification and must accept the invite. Use list_teams first to get the team_id if needed.",
  parameters: {
    type: "object",
    properties: {
      team_id: {
        type: "string",
        description: "The ID of the team to invite the user to."
      },
      email: {
        type: "string",
        description: "The email address of the user to invite."
      }
    },
    required: ["team_id", "email"]
  },
  execute: async (args, token) => {
    try {
      const { team_id, email } = args;
      if (!team_id) return { success: false, error: "team_id is required." };
      if (!email || !email.trim()) return { success: false, error: "Email is required." };

      console.log(`[MCP] Inviting ${email} to team ${team_id}`);

      const response = await axios.post(`${API_URL}/teams/${team_id}/members`, { email: email.trim() }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log('[MCP] Member invited:', response.data);

      return {
        success: true,
        message: `Invitation sent to ${email}. They will need to accept the invite to join the team.`,
        member: response.data
      };
    } catch (error) {
      console.error('[MCP] inviteTeamMember error:', error.response?.data || error.message);
      return { success: false, error: error.response?.data?.error || error.message };
    }
  }
};

module.exports = inviteTeamMember;
