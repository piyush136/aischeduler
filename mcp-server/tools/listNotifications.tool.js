const axios = require('axios');
const { buildAuthHeaders, getApiErrorMessage } = require('./utils/runtime');

const { BACKEND_API_URL: API_URL } = require('../config/api');

function normalizeNotification(notification) {
  const team = notification.team_id;
  const task = notification.task_id;

  return {
    notification_id: notification._id,
    type: notification.type,
    message: notification.message,
    is_read: Boolean(notification.is_read),
    created_at: notification.created_at,
    team_id: typeof team === 'object' ? team?._id : team,
    team_name: typeof team === 'object' ? team?.name : undefined,
    task_id: typeof task === 'object' ? task?._id : task,
    task_title: typeof task === 'object' ? task?.title : undefined
  };
}

const listNotifications = {
  name: 'list_notifications',
  description: 'List user notifications, unread notifications, or team invites. Use for inbox, notification, invite, and unread-count requests.',
  parameters: {
    type: 'object',
    properties: {
      filter: {
        type: 'string',
        enum: ['unread', 'team_invites', 'all'],
        description: 'Filter notifications. Default is unread.'
      },
      limit: {
        type: 'number',
        description: 'Maximum number of notifications to return. Default 10, max 50.'
      }
    }
  },
  execute: async (args, token) => {
    try {
      const filter = String(args.filter || 'unread').toLowerCase();
      const requestedLimit = Number(args.limit);
      const limit = Number.isFinite(requestedLimit) && requestedLimit > 0
        ? Math.min(Math.floor(requestedLimit), 50)
        : 10;

      const response = await axios.get(`${API_URL}/notifications`, {
        headers: buildAuthHeaders(token)
      });

      let notifications = Array.isArray(response.data) ? response.data : [];
      if (filter === 'unread') {
        notifications = notifications.filter(notification => !notification.is_read);
      } else if (filter === 'team_invites') {
        notifications = notifications.filter(notification => notification.type === 'team_invite' && !notification.is_read);
      }

      const items = notifications.slice(0, limit).map(normalizeNotification);
      const unreadCount = (Array.isArray(response.data) ? response.data : []).filter(notification => !notification.is_read).length;
      const teamInviteCount = (Array.isArray(response.data) ? response.data : []).filter(notification => notification.type === 'team_invite' && !notification.is_read).length;

      return {
        success: true,
        filter,
        count: items.length,
        unread_count: unreadCount,
        team_invite_count: teamInviteCount,
        notifications: items,
        message: items.length === 0
          ? `No ${filter.replace('_', ' ')} notifications found.`
          : `Found ${items.length} ${filter.replace('_', ' ')} notification${items.length === 1 ? '' : 's'}.`
      };
    } catch (error) {
      return { success: false, error: getApiErrorMessage(error, 'Failed to fetch notifications.') };
    }
  }
};

module.exports = listNotifications;
