const TelegramService = require('../services/telegram.service');
const User = require('../models/user.model');

class TelegramController {
  /**
   * POST /telegram/link-code
   * Generate a linking code for the authenticated user
   * Requires JWT authentication
   */
  static async generateLinkingCode(req, res) {
    try {
      const userId = req.user.id; // From auth middleware

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized. Please login first.'
        });
      }

      const result = await TelegramService.generateLinkingCode(userId);

      return res.status(200).json(result);
    } catch (error) {
      console.error('Error in generateLinkingCode:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to generate linking code',
        error: error.message
      });
    }
  }

  /**
   * POST /telegram/webhook
   * Receive Telegram webhook updates
   * Called by Telegram servers when user sends message to bot
   */
  static async handleWebhook(req, res) {
    try {
      // Telegram sends updates as JSON POST
      const update = req.body;

      // Immediately return 200 OK to Telegram (must be within 30 seconds)
      res.status(200).json({ ok: true });

      // Process update asynchronously (don't wait for completion)
      this._processUpdate(update).catch(error => {
        console.error('Error processing Telegram update:', error);
      });
    } catch (error) {
      console.error('Error in handleWebhook:', error);
      return res.status(200).json({ ok: true }); // Still return 200 to Telegram
    }
  }

  /**
   * GET /telegram/tasks
   * Get user's tasks (requires auth)
   */
  static async getUserTasks(req, res) {
    try {
      const userId = req.user.id; // From auth middleware

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized'
        });
      }

      const limit = parseInt(req.query.limit) || 5;
      const result = await TelegramService.getUserTasks(userId, limit);

      return res.status(200).json(result);
    } catch (error) {
      console.error('Error in getUserTasks:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch tasks',
        error: error.message
      });
    }
  }

  /**
   * Private method: Process Telegram update
   * Routes to appropriate handler based on message type
   */
  static async _processUpdate(update) {
    try {
      // Check if it's a message update
      if (!update.message) {
        return;
      }

      const message = update.message;
      const telegramId = String(message.from.id);
      const telegramUsername = message.from.username || null;
      const messageText = message.text || '';

      // Get or create TelegramUser (unlinked user may still send /link)
      const telegramUser = await require('../models/telegramUser.model').findOneAndUpdate(
        { telegram_id: telegramId },
        {
          telegram_id: telegramId,
          telegram_username: telegramUsername,
          $setOnInsert: { created_at: new Date(), is_linked: false }
        },
        { upsert: true, new: true }
      );

      // Route based on command or message
      if (messageText.startsWith('/start')) {
        await this._handleStartCommand(telegramId);
      } else if (messageText.startsWith('/link')) {
        const linkingCode = messageText.split(' ')[1];
        await this._handleLinkCommand(telegramId, telegramUsername, linkingCode);
      } else if (messageText.startsWith('/tasks')) {
        await this._handleTasksCommand(telegramId);
      } else if (messageText.startsWith('/help')) {
        await this._handleHelpCommand(telegramId);
      } else {
        // Regular message - create task from natural language
        await this._handleTaskCreation(telegramId, messageText);
      }
    } catch (error) {
      console.error('Error processing update:', error);
    }
  }

  /**
   * Handle /start command
   */
  static async _handleStartCommand(telegramId) {
    const bot = require('../config/telegram').bot;
    const message = TelegramService.getStartMessage();

    try {
      await bot.telegram.sendMessage(telegramId, message, {
        parse_mode: 'Markdown',
        disable_web_page_preview: true
      });
    } catch (error) {
      console.error('Error sending start message:', error);
    }
  }

  /**
   * Handle /link {code} command
   */
  static async _handleLinkCommand(telegramId, telegramUsername, linkingCode) {
    const bot = require('../config/telegram').bot;

    try {
      if (!linkingCode) {
        await bot.telegram.sendMessage(
          telegramId,
          '❌ Please provide a linking code.\nUsage: /link ABC123'
        );
        return;
      }

      const result = await TelegramService.linkTelegramAccount(
        linkingCode,
        telegramId,
        telegramUsername
      );

      await bot.telegram.sendMessage(telegramId, result.message);
    } catch (error) {
      console.error('Error handling link command:', error);
      await bot.telegram.sendMessage(
        telegramId,
        '❌ An error occurred while linking your account. Please try again.'
      );
    }
  }

  /**
   * Handle /tasks command
   */
  static async _handleTasksCommand(telegramId) {
    const bot = require('../config/telegram').bot;

    try {
      const user = await TelegramService.getUserByTelegramId(telegramId);

      if (!user) {
        await bot.telegram.sendMessage(
          telegramId,
          '⚠️ Your Telegram account is not linked. Use /link <code> to connect.'
        );
        return;
      }

      const result = await TelegramService.getUserTasks(user._id, 5);
      await bot.telegram.sendMessage(telegramId, result.message);
    } catch (error) {
      console.error('Error handling tasks command:', error);
      await bot.telegram.sendMessage(
        telegramId,
        '❌ Failed to fetch tasks. Please try again.'
      );
    }
  }

  /**
   * Handle /help command
   */
  static async _handleHelpCommand(telegramId) {
    const bot = require('../config/telegram').bot;
    const message = TelegramService.getHelpMessage();

    try {
      await bot.telegram.sendMessage(telegramId, message, {
        parse_mode: 'Markdown'
      });
    } catch (error) {
      console.error('Error sending help message:', error);
    }
  }

  /**
   * Handle regular message (task creation)
   */
  static async _handleTaskCreation(telegramId, messageText) {
    const bot = require('../config/telegram').bot;

    try {
      const user = await TelegramService.getUserByTelegramId(telegramId);

      if (!user) {
        await bot.telegram.sendMessage(
          telegramId,
          '⚠️ Your Telegram account is not linked.\n\n1. Go to the web app\n2. Click "Connect Telegram"\n3. Copy the code\n4. Send: /link <code>'
        );
        return;
      }

      // Show typing indicator
      await bot.telegram.sendChatAction(telegramId, 'typing');

      // Create task from message
      const result = await TelegramService.createTaskFromMessage(user._id, messageText);

      // Send response
      await bot.telegram.sendMessage(telegramId, result.message, {
        parse_mode: 'HTML'
      });
    } catch (error) {
      console.error('Error creating task:', error);
      await bot.telegram.sendMessage(
        telegramId,
        `❌ Error: ${error.message || 'Failed to create task'}`
      );
    }
  }
}

module.exports = TelegramController;
