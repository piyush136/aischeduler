const axios = require('axios');
const { normalizeDueAt } = require('./utils/dateTime');
const { buildAuthHeaders, getApiErrorMessage } = require('./utils/runtime');

const { BACKEND_API_URL: API_URL } = require('../config/api');

const findFreeSlots = {
  name: 'find_free_slots',
  description: 'Find available free time slots on a specific date for a given duration in minutes.',
  parameters: {
    type: 'object',
    properties: {
      date: {
        type: 'string',
        description: 'Date phrase or YYYY-MM-DD value.'
      },
      duration: {
        type: 'number',
        default: 30
      }
    },
    required: ['date']
  },
  execute: async (args, token) => {
    try {
      const { _meta = {}, duration = 30 } = args;
      const normalizedDate = normalizeDueAt(args.date, _meta);
      if (!normalizedDate.dueAt) {
        return { success: false, error: normalizedDate.error || `Could not understand "${args.date}".` };
      }

      const date = normalizedDate.dueAt.slice(0, 10);
      const response = await axios.get(`${API_URL}/tasks/free-slots`, {
        params: { date, duration },
        headers: buildAuthHeaders(token)
      });

      return response.data.success
        ? {
            success: true,
            message: response.data.freeSlots.length > 0
              ? `Found ${response.data.freeSlots.length} free slot(s) on ${date}.`
              : `No free slots of ${duration} minutes found on ${date}.`,
            slots: response.data.freeSlots
          }
        : { success: false, error: 'Failed to find free slots.' };
    } catch (error) {
      return { success: false, error: getApiErrorMessage(error, 'Failed to find free slots.') };
    }
  }
};

module.exports = findFreeSlots;
