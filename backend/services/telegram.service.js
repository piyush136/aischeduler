const axios = require('axios');
const jwt = require('jsonwebtoken');
const TelegramUser = require('../models/telegramUser.model');
const User = require('../models/user.model');
const Task = require('../models/task.model');

function getBotUsername() {
  return (process.env.TELEGRAM_BOT_USERNAME || 'ai_task_manager_bot').replace(/^@/, '');
}

function escapeMarkdown(value) {
  return String(value).replace(/([_*[\]()~`>#+\-=|{}.!])/g, '\\$1');
}

function buildMcpChatUrl() {
  const baseUrl = (process.env.MCP_SERVER_URL || 'http://localhost:5001').replace(/\/+$/, '');
  return baseUrl.endsWith('/mcp') ? `${baseUrl}/chat` : `${baseUrl}/mcp/chat`;
}

function getLocalContext() {
  const timezone = process.env.USER_TIMEZONE || process.env.TZ || 'Asia/Kolkata';
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(now);
  const byType = Object.fromEntries(parts.map(part => [part.type, part.value]));

  return {
    localDate: `${byType.year}-${byType.month}-${byType.day}`,
    localTimeString: now.toLocaleTimeString('en-US', { timeZone: timezone }),
    userTimezone: timezone
  };
}

class TelegramService {
  /**
   * Generate a 6-character alphanumeric linking code for a user
   * Code automatically expires in 30 minutes via MongoDB TTL index
   */
  static async generateLinkingCode(userId) {
    try {
      const code = this._generateRandomCode(6);

      // Check if TelegramUser document exists for this user, update or create
      let telegramUser = await TelegramUser.findOneAndUpdate(
        { $or: [{ user_id: userId }, { telegram_id: `pending:${userId}` }] },
        {
          $set: {
            user_id: userId,
            linking_code: code,
            created_at: new Date() // Reset timestamp for TTL
          },
          $setOnInsert: {
            telegram_id: `pending:${userId}`,
            is_linked: false
          }
        },
        { 
          upsert: true,
          new: true,
          runValidators: true
        }
      );

      return {
        success: true,
        linking_code: code,
        expires_in_minutes: 30,
        message: `Your linking code: ${code}. Send /link ${code} to @${getBotUsername()} to connect your account.`
      };
    } catch (error) {
      console.error('Error generating linking code:', error);
      throw new Error('Failed to generate linking code');
    }
  }

  /**
   * Link a Telegram account to a user account using linking code
   */
  static async linkTelegramAccount(linkingCode, telegramId, telegramUsername) {
    try {
      // Verify the linking code exists and belongs to a user
      const telegramUser = await TelegramUser.findOne({ linking_code: linkingCode });

      if (!telegramUser) {
        return {
          success: false,
          message: 'Invalid or expired linking code. Please generate a new code from the web app.'
        };
      }

      if (!telegramUser.user_id) {
        return {
          success: false,
          message: 'Linking code is not associated with a valid user account.'
        };
      }

      // Telegram creates a placeholder row when the user first messages the bot.
      // Remove that row before attaching the Telegram ID to the web-generated code.
      await TelegramUser.deleteOne({
        telegram_id: telegramId,
        _id: { $ne: telegramUser._id }
      });

      // Update TelegramUser with Telegram info and mark as linked
      const updatedTelegramUser = await TelegramUser.findByIdAndUpdate(
        telegramUser._id,
        {
          telegram_id: telegramId,
          telegram_username: telegramUsername,
          is_linked: true,
          linked_at: new Date(),
          linking_code: null // Clear the linking code after successful link
        },
        { new: true }
      );

      // Also update User model with telegram_id for quick lookup
      await User.findByIdAndUpdate(
        telegramUser.user_id,
        { telegram_id: telegramId },
        { new: true }
      );

      return {
        success: true,
        message: `✅ Account linked successfully! You can now create tasks via Telegram. Send natural language messages like "meeting tomorrow 5pm" or use /tasks to see your tasks.`
      };
    } catch (error) {
      console.error('Error linking Telegram account:', error);
      throw new Error('Failed to link account');
    }
  }

  /**
   * Get Telegram link status for a web user.
   */
  static async getLinkStatus(userId) {
    try {
      const telegramUser = await TelegramUser.findOne({ user_id: userId, is_linked: true })
        .select('telegram_id telegram_username linked_at');

      return {
        success: true,
        linked: Boolean(telegramUser),
        telegram: telegramUser ? {
          telegram_id: telegramUser.telegram_id,
          telegram_username: telegramUser.telegram_username,
          linked_at: telegramUser.linked_at
        } : null
      };
    } catch (error) {
      console.error('Error fetching Telegram link status:', error);
      throw new Error('Failed to fetch Telegram link status');
    }
  }

  /**
   * Unlink Telegram from a web user account.
   */
  static async unlinkByUserId(userId) {
    try {
      const telegramUser = await TelegramUser.findOne({ user_id: userId, is_linked: true });

      await TelegramUser.deleteMany({
        user_id: userId,
        telegram_id: `pending:${userId}`
      });

      await TelegramUser.updateMany(
        { user_id: userId },
        {
          $set: {
            user_id: null,
            is_linked: false,
            linked_at: null,
            linking_code: null
          }
        }
      );

      await User.findByIdAndUpdate(userId, { telegram_id: null });

      return {
        success: true,
        linked: false,
        telegram_id: telegramUser?.telegram_id || null,
        message: telegramUser
          ? 'Telegram account unlinked successfully.'
          : 'Telegram account was not linked.'
      };
    } catch (error) {
      console.error('Error unlinking Telegram account:', error);
      throw new Error('Failed to unlink Telegram account');
    }
  }

  /**
   * Unlink from inside Telegram using the sender's Telegram ID.
   */
  static async unlinkByTelegramId(telegramId) {
    try {
      const telegramUser = await TelegramUser.findOne({ telegram_id: telegramId, is_linked: true });

      if (!telegramUser) {
        return {
          success: false,
          message: 'Your Telegram account is not linked.'
        };
      }

      await User.findByIdAndUpdate(telegramUser.user_id, { telegram_id: null });

      await TelegramUser.findByIdAndUpdate(telegramUser._id, {
        user_id: null,
        is_linked: false,
        linked_at: null,
        linking_code: null
      });

      return {
        success: true,
        message: 'Telegram account unlinked successfully. You can link again from the web app anytime.'
      };
    } catch (error) {
      console.error('Error unlinking Telegram account by Telegram ID:', error);
      throw new Error('Failed to unlink Telegram account');
    }
  }

  /**
   * Find a user account by Telegram ID
   */
  static async getUserByTelegramId(telegramId) {
    try {
      const telegramUser = await TelegramUser.findOne({ telegram_id: telegramId, is_linked: true })
        .populate('user_id');

      if (!telegramUser || !telegramUser.user_id) {
        return null;
      }

      return telegramUser.user_id;
    } catch (error) {
      console.error('Error fetching user by Telegram ID:', error);
      throw new Error('Failed to fetch user');
    }
  }

  /**
   * Create a task from natural language message via MCP Server
   * Calls the existing task.controller POST /tasks endpoint with MCP-parsed data
   */
  static async createTaskFromMessage(userId, messageText) {
    try {
      // Get user to ensure they exist
      const user = await User.findById(userId);
      if (!user) {
        return {
          success: false,
          message: '❌ User account not found.'
        };
      }

      // Call MCP Server to parse the natural language message
      // MCP Server returns parsed task data (title, due_at, description, priority, etc.)
      const mcpResponse = await this._callMCPServer(messageText, user);

      if (mcpResponse?.handled) {
        return {
          success: mcpResponse.success,
          message: mcpResponse.message,
          data: mcpResponse.data
        };
      }

      if (!mcpResponse || !mcpResponse.tasks || mcpResponse.tasks.length === 0) {
        return {
          success: false,
          message: '❌ I couldn\'t understand that. Try: "meeting tomorrow 5pm" or "project deadline next Friday"'
        };
      }

      // Create task(s) from MCP parsed data
      const createdTasks = [];
      const failedTasks = [];

      for (const parsedTask of mcpResponse.tasks) {
        try {
          const taskPayload = {
            title: parsedTask.title,
            description: parsedTask.description || '',
            due_at: parsedTask.due_at,
            has_time: parsedTask.has_time || false,
            priority: parsedTask.priority || 3,
            duration_minutes: parsedTask.duration_minutes || 60,
            location: parsedTask.location || null,
            tags: parsedTask.tags || [],
            is_recurring: parsedTask.is_recurring || false,
            recurrence_pattern: parsedTask.recurrence_pattern || null
          };

          // Call task service to create the task
          const taskService = require('./task.service');
          const createdTask = await taskService.create(taskPayload, userId);

          createdTasks.push(createdTask);
        } catch (taskError) {
          console.error('Error creating individual task:', taskError);
          failedTasks.push({
            title: parsedTask.title,
            error: taskError.message
          });
        }
      }

      // Build response message
      let message = '';
      if (createdTasks.length > 0) {
        message += `✅ ${createdTasks.length} task(s) created:\n`;
        createdTasks.forEach((task, index) => {
          message += `• ${task.title} - Due: ${new Date(task.due_at).toLocaleDateString()}\n`;
        });
      }

      if (failedTasks.length > 0) {
        message += `\n⚠️ ${failedTasks.length} task(s) failed to create`;
      }

      return {
        success: createdTasks.length > 0,
        message: message,
        created_tasks: createdTasks,
        failed_tasks: failedTasks
      };
    } catch (error) {
      console.error('Error creating task from message:', error);
      return {
        success: false,
        message: `❌ Error: ${error.message || 'Failed to create task'}`
      };
    }
  }

  /**
   * Get user's recent tasks for /tasks command
   */
  static async getUserTasks(userId, limit = 5) {
    try {
      const tasks = await Task.find({ user_id: userId })
        .sort({ due_at: 1 })
        .limit(limit)
        .select('title due_at status priority has_time');

      if (tasks.length === 0) {
        return {
          success: true,
          message: '📋 No tasks found. Create one by sending a message like "meeting tomorrow 5pm"',
          tasks: []
        };
      }

      let message = `📋 Your next ${tasks.length} task(s):\n\n`;
      tasks.forEach((task, index) => {
        const status = task.status === 'completed' ? '✅' : '⭕';
        const dueDate = new Date(task.due_at).toLocaleDateString();
        const dueTime = task.has_time ? ` at ${new Date(task.due_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : '';
        message += `${index + 1}. ${status} ${task.title}\n   📅 ${dueDate}${dueTime}\n`;
      });

      return {
        success: true,
        message: message,
        tasks: tasks
      };
    } catch (error) {
      console.error('Error fetching user tasks:', error);
      return {
        success: false,
        message: '❌ Failed to fetch tasks',
        tasks: []
      };
    }
  }

  /**
   * Get help message with available commands
   */
  static getHelpMessage() {
    return `🤖 *AI Task Manager Bot Commands*

/start - Show welcome message
/link <code> - Link your Telegram account (get code from web app)
/unlink - Disconnect this Telegram account
/tasks - View your recent tasks
/help - Show this help message

*How to create tasks:*
Just send a natural language message like:
• "meeting tomorrow 5pm"
• "project deadline next Friday"
• "lunch with John Monday 12pm"
• "workout every morning"

The AI will parse your message and create the task automatically! ✨`;
  }

  /**
   * Get start message
   */
  static getStartMessage() {
    const botUsername = getBotUsername();
    const markdownBotUsername = escapeMarkdown(botUsername);

    return `👋 *Welcome to AI Task Manager Bot!*

I help you create tasks and manage your schedule using natural language.

*First, link your account:*
1. Go to the web app and open Profile > Integrations
2. Click "Connect Telegram"
3. Copy the linking code
4. Send here to @${markdownBotUsername}: /link <code>

Once linked, you can:
• Send messages to create tasks: "meeting tomorrow 5pm"
• View tasks: /tasks
• Disconnect Telegram: /unlink
• Get help: /help

Let's get started! 🚀`;
  }

  /**
   * Call MCP Server to parse natural language into task data
   * MCP Server is running on localhost:5001 (or configured port)
   */
  static async _callMCPServer(messageText, user) {
    try {
      if (!process.env.JWT_SECRET) {
        throw new Error('JWT_SECRET is required for Telegram MCP requests');
      }

      const token = jwt.sign(
        { id: user.id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: '10m' }
      );

      const response = await axios.post(
        buildMcpChatUrl(),
        {
          message: messageText,
          history: [],
          ...getLocalContext()
        },
        {
          timeout: 20000,
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      const data = response.data || {};
      const toolResult = data.data;
      return {
        handled: true,
        success: toolResult?.success !== false,
        message: data.reply || toolResult?.message || 'Done.',
        data
      };
    } catch (error) {
      console.error('Error calling MCP Server:', error.response?.data || error.message);
      
      // Fallback: Try basic parsing if MCP fails
      const fallbackTask = this._parseTaskBasic(messageText);
      if (fallbackTask) {
        return { tasks: [fallbackTask] };
      }

      return null;
    }
  }

  /**
   * Basic fallback task parsing if MCP Server is unavailable
   * Handles simple cases like "title tomorrow time"
   */
  static _parseTaskBasic(messageText) {
    try {
      // Very basic regex-based parsing for fallback
      // Looks for patterns like: "task [tomorrow|today|next week|next monday|tomorrow 5pm]"
      
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(9, 0, 0, 0);

      return {
        title: messageText.substring(0, 100), // Use first 100 chars as title
        description: '',
        due_at: tomorrow,
        has_time: false,
        priority: 3,
        duration_minutes: 60
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Generate a random alphanumeric code
   */
  static _generateRandomCode(length = 6) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < length; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }
}

module.exports = TelegramService;
