const axios = require('axios');
const { buildAuthHeaders, getApiErrorMessage } = require('./utils/runtime');

const { BACKEND_API_URL: API_URL } = require('../config/api');

const listReminders = {
  name: 'list_reminders',
  description: 'List reminders for today or all reminders.',
  parameters: {
    type: 'object',
    properties: {
      scope: {
        type: 'string',
        enum: ['today', 'all']
      }
    }
  },
  execute: async (args, token) => {
    try {
      const scope = args.scope || 'all';
      const response = await axios.get(`${API_URL}/reminders`, {
        params: { scope },
        headers: buildAuthHeaders(token)
      });

      const reminders = response.data || [];
      return {
        success: true,
        count: reminders.length,
        reminders,
        message: reminders.length === 0
          ? `No ${scope} reminders found.`
          : `Found ${reminders.length} ${scope} reminder(s).`
      };
    } catch (error) {
      return { success: false, error: getApiErrorMessage(error, 'Failed to fetch reminders.') };
    }
  }
};

module.exports = listReminders;
