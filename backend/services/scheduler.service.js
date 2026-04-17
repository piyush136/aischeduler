const cron = require('node-cron');
const Task = require('../models/task.model');
const emailService = require('./email.service');
const reminderService = require('./reminder.service');

class SchedulerService {
  init() {
    console.log('[Scheduler] Initialized. Checking reminders every minute.');

    const checkTasks = async () => {
      try {
        await this.processCustomReminders();
        await this.processDefaultUpcomingTasks();
      } catch (error) {
        console.error('[Scheduler] Error:', error);
      }
    };

    checkTasks();
    cron.schedule('* * * * *', checkTasks);
  }

  async processCustomReminders() {
    const dueReminders = await reminderService.getDue();
    if (dueReminders.length === 0) return;

    for (const reminder of dueReminders) {
      const task = reminder.task_id;
      if (!task?.user_id?.email) {
        await reminderService.updateStatus(reminder._id, 'failed');
        continue;
      }

      const sent = await emailService.sendTaskReminderEmail(
        task.user_id.email,
        task.user_id.name || 'User',
        task
      );

      await reminderService.updateStatus(reminder._id, sent ? 'sent' : 'failed');
    }
  }

  async processDefaultUpcomingTasks() {
    const reminderTaskIds = await reminderService.getScheduledTaskIds();
    const now = new Date();
    const thirtyMinutesFromNow = new Date(now.getTime() + 30 * 60000);

    const upcomingTasks = await Task.find({
      _id: { $nin: reminderTaskIds },
      status: 'pending',
      has_time: { $ne: false },
      due_at: { $gt: now, $lte: thirtyMinutesFromNow },
      email_reminder_sent: { $ne: true }
    }).populate('user_id', 'email name');

    if (upcomingTasks.length === 0) return;

    for (const task of upcomingTasks) {
      await this.processDefaultReminder(task);
    }
  }

  async processDefaultReminder(task) {
    if (task.user_id?.email) {
      const sent = await emailService.sendTaskReminderEmail(
        task.user_id.email,
        task.user_id.name || 'User',
        task
      );

      if (sent) {
        task.email_reminder_sent = true;
        await task.save();
      }
      return;
    }

    task.email_reminder_sent = true;
    await task.save();
  }
}

module.exports = new SchedulerService();
