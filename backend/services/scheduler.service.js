const cron = require('node-cron');
const reminderService = require('./reminder.service');
const Task = require('../models/task.model');
// const notificationService = require('./notification.service'); // Future email/push

class SchedulerService {
  init() {
    console.log('[Scheduler] Initialized. Checking for reminders every minute.');
    
    // Check every minute
    cron.schedule('* * * * *', async () => {
      try {
        console.log('[Scheduler] Checking for due reminders...');
        const dueReminders = await reminderService.getDue();
        
        if (dueReminders.length === 0) return;

        console.log(`[Scheduler] Found ${dueReminders.length} due reminders.`);

        for (const reminder of dueReminders) {
          await this.processReminder(reminder);
        }
      } catch (err) {
        console.error('[Scheduler] Error:', err);
      }
    });
  }

  async processReminder(reminder) {
    // 1. Send Notification (Simulated)
    const taskTitle = reminder.task_id ? reminder.task_id.title : 'Unknown Task';
    console.log(`\n🔔 REMINDER: ${taskTitle} is due at ${reminder.remind_at}!\n`);

    // 2. Mark as sent
    await reminderService.updateStatus(reminder._id, 'sent');
  }
}

module.exports = new SchedulerService();
