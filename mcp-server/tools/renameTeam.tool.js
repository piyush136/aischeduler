const axios = require('axios');

const { BACKEND_API_URL: API_URL } = require('../config/api');

const renameTeam = {
  name: "rename_team",
  description: "Rename a team. Only team admins can rename a team. Use list_teams first to get the team_id if you don't know it.",
  parameters: {
    type: "object",
    properties: {
      team_id: {
        type: "string",
        description: "The ID of the team to rename."
      },
      name: {
        type: "string",
        description: "The new name for the team."
      }
    },
    required: ["team_id", "name"]
  },
  execute: async (args, token) => {
    try {
      const { team_id, name } = args;
      if (!team_id) return { success: false, error: "team_id is required." };
      if (!name || !name.trim()) return { success: false, error: "New team name is required." };

      console.log(`[MCP] Renaming team ${team_id} to "${name}"`);

      const response = await axios.patch(`${API_URL}/teams/${team_id}`, { name: name.trim() }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log('[MCP] Team renamed:', response.data);

      return {
        success: true,
        message: `Team renamed to "${response.data.name}" successfully!`,
        team: {
          team_id: response.data._id,
          name: response.data.name
        }
      };
    } catch (error) {
      console.error('[MCP] renameTeam error:', error.response?.data || error.message);
      return { success: false, error: error.response?.data?.error || error.message };
    }
  }
};

module.exports = renameTeam;
