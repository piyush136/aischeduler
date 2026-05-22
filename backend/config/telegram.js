const { Telegraf } = require('telegraf');

/**
 * Telegraf Bot Configuration
 * Initializes the Telegram bot with webhook mode for production
 */

let bot = null;

/**
 * Initialize Telegraf bot
 */
function initializeTelegramBot() {
  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token) {
    console.warn(
      '⚠️  TELEGRAM_BOT_TOKEN not set. Telegram bot will not be initialized. ' +
      'Set it in .env file to enable Telegram integration.'
    );
    return null;
  }

  // Create bot instance
  bot = new Telegraf(token);

  // Set webhook URL for production
  const webhookUrl = process.env.TELEGRAM_WEBHOOK_URL;
  const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET;

  if (webhookUrl) {
    // Production: webhook mode
    bot.telegram.setWebhook(webhookUrl, {
      secret_token: webhookSecret // Optional: adds X-Telegram-Bot-Api-Secret-Token header validation
    }).then(() => {
      console.log(`✅ Telegram webhook set to: ${webhookUrl}`);
    }).catch((error) => {
      console.error('❌ Failed to set Telegram webhook:', error.message);
    });
  } else {
    console.warn(
      '⚠️  TELEGRAM_WEBHOOK_URL not set. Telegram bot will use long polling mode (development only). ' +
      'For production, set TELEGRAM_WEBHOOK_URL in .env file.'
    );
    // Fallback to polling mode for development
    bot.launch().then(() => {
      console.log('✅ Telegram bot started (polling mode - development only)');
    }).catch((error) => {
      console.error('❌ Failed to start Telegram bot:', error.message);
    });
  }

  // Error handler
  bot.catch((err, ctx) => {
    console.error('❌ Telegram bot error:', err);
    // Try to send error message to user
    try {
      ctx.reply('Sorry, an error occurred. Please try again.').catch(() => {});
    } catch (e) {
      console.error('Failed to send error message:', e);
    }
  });

  // Optional: Enable graceful shutdown
  process.once('SIGINT', () => {
    if (webhookUrl) {
      console.log('Shutting down Telegram bot...');
      bot.stop('SIGINT');
    }
  });

  process.once('SIGTERM', () => {
    if (webhookUrl) {
      console.log('Shutting down Telegram bot...');
      bot.stop('SIGTERM');
    }
  });

  return bot;
}

/**
 * Get bot instance
 */
function getBot() {
  if (!bot) {
    bot = initializeTelegramBot();
  }
  return bot;
}

module.exports = {
  bot: getBot(),
  initializeTelegramBot,
  getBot
};
