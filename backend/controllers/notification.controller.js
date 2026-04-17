const notificationService = require('../services/notification.service');

exports.getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const notifications = await notificationService.getUserNotifications(userId);
    res.json(notifications);
  } catch (err) {
    console.error('[NotificationController] Get notifications error:', err);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const notification = await notificationService.markAsRead(id, userId);

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json(notification);
  } catch (err) {
    console.error('[NotificationController] Mark read error:', err);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
};

exports.getUnreadCount = async (req, res) => {
  try {
    const userId = req.user.id;
    const count = await notificationService.getUnreadCount(userId);
    res.json({ count });
  } catch (err) {
    console.error('[NotificationController] Unread count error:', err);
    res.status(500).json({ error: 'Failed to get unread count' });
  }
};
