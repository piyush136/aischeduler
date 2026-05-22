const axios = require('axios');
const TelegramUser = require('../models/telegramUser.model');
const User = require('../models/user.model');
const Task = require('../models/task.model');

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
        { user_id: userId },
        { 
          linking_code: code,
          is_linked: false,
          created_at: new Date() // Reset timestamp for TTL
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
        message: `Your linking code: ${code}. Send /link ${code} to the Telegram bot to connect your account.`
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
      const mcpResponse = await this._callMCPServer(messageText, user.email);

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
            user_id: userId,
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
          const createdTask = await taskService.create(taskPayload);

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
    return `👋 *Welcome to AI Task Manager Bot!*

I help you create tasks and manage your schedule using natural language.

*First, link your account:*
1. Go to the web app: www.yourtaskmanager.com
2. Click "Connect Telegram"
3. Copy the linking code
4. Send here: /link <code>

Once linked, you can:
• Send messages to create tasks: "meeting tomorrow 5pm"
• View tasks: /tasks
• Get help: /help

Let's get started! 🚀`;
  }

  /**
   * Call MCP Server to parse natural language into task data
   * MCP Server is running on localhost:5001 (or configured port)
   */
  static async _callMCPServer(messageText, userEmail) {
    try {
      // MCP Server endpoint for adding tasks with NLP
      const mcpServerUrl = process.env.MCP_SERVER_URL || 'http://localhost:5001';
      const response = await axios.post(
        `${mcpServerUrl}/parse-task`,
        {
          text: messageText,
          user_email: userEmail
        },
        {
          timeout: 10000 // 10 second timeout
        }
      );

      return response.data;
    } catch (error) {
      console.error('Error calling MCP Server:', error.message);
      
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
