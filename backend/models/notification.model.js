const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    description: 'The receiver of the notification'
  },
  type: {
    type: String,
    enum: ['task_assigned', 'comment', 'mention', 'team_invite', 'team_message', 'info', 'reminder'],
    required: true
  },
  task_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task',
    default: null
  },
  team_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    default: null
  },
  actor_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
    description: 'The user who triggered the notification'
  },
  conversation_type: {
    type: String,
    enum: ['direct', 'team', null],
    default: null
  },
  message: {
    type: String,
    required: true
  },
  is_read: {
    type: Boolean,
    default: false
  }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

// Fast lookup: all notifications for a user, newest first
notificationSchema.index({ user_id: 1, created_at: -1 });
// Fast count of unread
notificationSchema.index({ user_id: 1, is_read: 1 });

module.exports = mongoose.model('Notification', notificationSchema);
