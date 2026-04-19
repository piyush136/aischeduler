const Notification = require('../models/notification.model');

class NotificationService {
  /**
   * Create a notification
   */
  async create(data) {
    const notification = new Notification({
      user_id: data.user_id,
      type: data.type,
      task_id: data.task_id || null,
      team_id: data.team_id || null,
      actor_id: data.actor_id || null,
      conversation_type: data.conversation_type || null,
      message: data.message,
      is_read: false
    });
    return await notification.save();
  }

  /**
   * Get all notifications for a user, sorted newest first
   */
  async getUserNotifications(userId) {
    return await Notification.find({ user_id: userId })
      .populate('task_id', 'title status due_at')
      .populate('team_id', 'name')
      .populate('actor_id', 'name email profile_picture')
      .sort({ created_at: -1 })
      .limit(50)
      .lean();
  }

  /**
   * Mark a notification as read
   */
  async markAsRead(notificationId, userId) {
    return await Notification.findOneAndUpdate(
      { _id: notificationId, user_id: userId },
      { $set: { is_read: true } },
      { new: true }
    );
  }

  /**
   * Get unread count for a user
   */
  async getUnreadCount(userId) {
    return await Notification.countDocuments({
      user_id: userId,
      is_read: false
    });
  }
}

module.exports = new NotificationService();
