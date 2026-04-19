const axios = require('axios');
const { buildAuthHeaders, getApiErrorMessage } = require('./utils/runtime');

const { BACKEND_API_URL: API_URL } = require('../config/api');

const disconnectCalendar = {
  name: 'disconnect_calendar',
  description: 'Disconnect Google Calendar from the current account.',
  parameters: {
    type: 'object',
    properties: {}
  },
  execute: async (args, token) => {
    try {
      const response = await axios.post(`${API_URL}/calendar/disconnect`, {}, {
        headers: buildAuthHeaders(token)
      });

      return {
        success: true,
        message: response.data.message || 'Google Calendar disconnected.'
      };
    } catch (error) {
      return { success: false, error: getApiErrorMessage(error, 'Failed to disconnect Google Calendar.') };
    }
  }
};

module.exports = disconnectCalendar;
