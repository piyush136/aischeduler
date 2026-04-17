const axios = require('axios');

const API_URL = process.env.BACKEND_URL;

const updateMemberPermissions = {
  name: "update_member_permissions",
  description: "Update a team member's permissions. Only admins can change permissions. Use list_team_members to find the member_id first.",
  parameters: {
    type: "object",
    properties: {
      team_id: {
        type: "string",
        description: "The ID of the team."
      },
      member_id: {
        type: "string",
        description: "The membership ID (_id) of the member whose permissions to update."
      },
      can_add_task: {
        type: "boolean",
        description: "Whether the member is allowed to create tasks in the team."
      },
      can_edit_task: {
        type: "boolean",
        description: "Whether the member is allowed to edit tasks in the team."
      }
    },
    required: ["team_id", "member_id"]
  },
  execute: async (args, token) => {
    try {
      const { team_id, member_id, can_add_task, can_edit_task } = args;
      if (!team_id) return { success: false, error: "team_id is required." };
      if (!member_id) return { success: false, error: "member_id is required." };

      if (typeof can_add_task !== 'boolean' && typeof can_edit_task !== 'boolean') {
        return { success: false, error: "At least one of can_add_task or can_edit_task must be provided." };
      }

      const body = {};
      if (typeof can_add_task === 'boolean') body.can_add_task = can_add_task;
      if (typeof can_edit_task === 'boolean') body.can_edit_task = can_edit_task;

      console.log(`[MCP] Updating permissions for member ${member_id} in team ${team_id}:`, body);

      const response = await axios.patch(
        `${API_URL}/teams/${team_id}/members/${member_id}/permissions`,
        body,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      console.log('[MCP] Permissions updated:', response.data);

      return {
        success: true,
        message: "Member permissions updated successfully.",
        member: response.data
      };
    } catch (error) {
      console.error('[MCP] updateMemberPermissions error:', error.response?.data || error.message);
      return { success: false, error: error.response?.data?.error || error.message };
    }
  }
};

module.exports = updateMemberPermissions;
