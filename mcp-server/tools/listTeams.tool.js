const axios = require('axios');

const { BACKEND_API_URL: API_URL } = require('../config/api');

const listTeams = {
  name: "list_teams",
  description: "List all teams the current user belongs to. Returns team names, IDs, and the user's role in each team.",
  parameters: {
    type: "object",
    properties: {},
    required: []
  },
  execute: async (args, token) => {
    try {
      console.log('[MCP] Fetching user teams...');

      const response = await axios.get(`${API_URL}/teams`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const teams = response.data || [];

      if (teams.length === 0) {
        return { success: true, message: "You are not a member of any teams yet.", count: 0, teams: [] };
      }

      const simplified = teams.map(t => ({
        team_id: t.team_id || t._id,
        name: t.name,
        role: t.role,
        status: t.status
      }));

      console.log(`[MCP] Found ${simplified.length} teams`);

      return { success: true, count: simplified.length, teams: simplified };
    } catch (error) {
      console.error('[MCP] listTeams error:', error.response?.data || error.message);
      return { success: false, error: error.response?.data?.error || error.message };
    }
  }
};

module.exports = listTeams;
