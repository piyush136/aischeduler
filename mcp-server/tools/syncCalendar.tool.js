const axios = require('axios');
const { buildAuthHeaders, getApiErrorMessage } = require('./utils/runtime');

const API_URL = process.env.BACKEND_URL;

const syncCalendar = {
  name: 'sync_calendar',
  description: 'Sync future MongoDB tasks to Google Calendar.',
  parameters: {
    type: 'object',
    properties: {}
  },
  execute: async (args, token) => {
    try {
      const response = await axios.post(`${API_URL}/calendar/sync`, {}, {
        headers: buildAuthHeaders(token)
      });

      return {
        success: true,
        syncSummary: response.data.syncSummary,
        message: `Calendar sync completed. Synced ${response.data.syncSummary?.synced || 0} task(s).`
      };
    } catch (error) {
      return { success: false, error: getApiErrorMessage(error, 'Failed to sync Google Calendar.') };
    }
  }
};

module.exports = syncCalendar;
