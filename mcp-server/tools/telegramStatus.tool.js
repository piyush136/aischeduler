const axios = require('axios');
const { buildAuthHeaders, getApiErrorMessage } = require('./utils/runtime');

const { BACKEND_API_URL: API_URL } = require('../config/api');

const telegramStatus = {
  name: 'telegram_status',
  description: 'Check whether the current user has linked the Telegram bot integration.',
  parameters: {
    type: 'object',
    properties: {}
  },
  execute: async (args, token) => {
    try {
      const response = await axios.get(`${API_URL}/telegram/status`, {
        headers: buildAuthHeaders(token)
      });

      const linked = Boolean(response.data?.linked);
      const telegram = response.data?.telegram || null;

      return {
        success: true,
        linked,
        telegram,
        message: linked
          ? `Telegram is linked${telegram?.telegram_username ? ` as @${telegram.telegram_username}` : ''}.`
          : 'Telegram is not linked.'
      };
    } catch (error) {
      return { success: false, error: getApiErrorMessage(error, 'Failed to check Telegram status.') };
    }
  }
};

module.exports = telegramStatus;
