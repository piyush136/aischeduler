const Reminder = require('../models/reminder.model');
const Task = require('../models/task.model');

class ReminderService {
  async upsert(task, reminderData) {
    return Reminder.findOneAndUpdate(
      { task_id: task._id },
      {
        $set: {
          remind_at: reminderData.remind_at,
          offset_minutes: reminderData.offset_minutes ?? null,
          status: 'scheduled'
        }
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true
      }
    );
  }

  async getDue() {
    return Reminder.find({
      remind_at: { $lte: new Date() },
      status: 'scheduled'
    }).populate({
      path: 'task_id',
      populate: {
        path: 'user_id',
        model: 'User',
        select: 'email name'
      }
    });
  }

  async getScheduledTaskIds() {
    return Reminder.distinct('task_id', { status: 'scheduled' });
  }

  async listForUser(userId, filters = {}) {
    const taskIds = await Task.find({ user_id: userId }).distinct('_id');
    const query = { task_id: { $in: taskIds } };

    if (filters.start || filters.end) {
      query.remind_at = {};
      if (filters.start) query.remind_at.$gte = filters.start;
      if (filters.end) query.remind_at.$lte = filters.end;
    }

    return Reminder.find(query)
      .populate('task_id', 'title due_at status')
      .sort({ remind_at: 1 });
  }

  async updateStatus(id, status) {
    return Reminder.findByIdAndUpdate(id, { status }, { new: true });
  }

  async deleteByTask(taskId) {
    return Reminder.deleteMany({ task_id: taskId });
  }

  async syncForTask(task) {
    const reminder = await Reminder.findOne({ task_id: task._id, status: 'scheduled' });
    if (!reminder || reminder.offset_minutes === null || !task.due_at) {
      return reminder;
    }

    const remindAt = new Date(new Date(task.due_at).getTime() - reminder.offset_minutes * 60 * 1000);
    reminder.remind_at = remindAt;
    return reminder.save();
  }
}

module.exports = new ReminderService();
