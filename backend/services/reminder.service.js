const Reminder = require('../models/reminder.model');

class ReminderService {
  async schedule(taskId, reminderData) {
    const reminder = new Reminder({
      task_id: taskId,
      ...reminderData
    });
    return await reminder.save();
  }

  async getDue() {
    return await Reminder.find({
      remind_at: { $lte: new Date() },
      status: 'scheduled'
    }).populate('task_id');
  }

  async updateStatus(id, status) {
    return await Reminder.findByIdAndUpdate(id, { status }, { new: true });
  }
}

module.exports = new ReminderService();
