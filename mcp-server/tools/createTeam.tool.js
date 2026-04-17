const axios = require('axios');

const API_URL = process.env.BACKEND_URL;

const createTeam = {
  name: "create_team",
  description: "Create a new team. The user who creates the team becomes the admin. Other users can then be invited to join.",
  parameters: {
    type: "object",
    properties: {
      name: {
        type: "string",
        description: "The name for the new team (e.g., 'Marketing', 'Engineering')."
      }
    },
    required: ["name"]
  },
  execute: async (args, token) => {
    try {
      const { name } = args;
      if (!name || !name.trim()) {
        return { success: false, error: "Team name is required." };
      }

      console.log(`[MCP] Creating team: "${name}"`);

      const response = await axios.post(`${API_URL}/teams`, { name: name.trim() }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log('[MCP] Team created:', response.data);

      return {
        success: true,
        message: `Team "${response.data.name}" created successfully!`,
        team: {
          team_id: response.data._id,
          name: response.data.name,
          created_by: response.data.created_by
        }
      };
    } catch (error) {
      console.error('[MCP] createTeam error:', error.response?.data || error.message);
      return { success: false, error: error.response?.data?.error || error.message };
    }
  }
};

module.exports = createTeam;
