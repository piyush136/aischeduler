const Task = require('../models/task.model');

class TaskService {
  async create(taskData, userId) {
    const task = new Task({
      ...taskData,
      user_id: userId
    });
    return await task.save();
  }

  async getAll(userId) {
    return await Task.find({ user_id: userId }).sort({ due_at: 1 });
  }

  async getToday(userId) {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    return await Task.find({
      user_id: userId,
      due_at: {
        $gte: startOfDay,
        $lte: endOfDay
      }
    }).sort({ due_at: 1 });
  }

  async update(taskId, userId, updates) {
    return await Task.findOneAndUpdate(
      { _id: taskId, user_id: userId },
      { $set: updates },
      { new: true }
    );
  }

  async delete(taskId, userId) {
    const result = await Task.deleteOne({ _id: taskId, user_id: userId });
    return result.deletedCount > 0;
  }
}

module.exports = new TaskService();
