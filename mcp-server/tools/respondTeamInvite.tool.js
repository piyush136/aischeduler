const axios = require('axios');
const { buildAuthHeaders, cleanString, getApiErrorMessage } = require('./utils/runtime');

const { BACKEND_API_URL: API_URL } = require('../config/api');

function getTeamId(notification) {
  const team = notification?.team_id;
  if (!team) return null;
  return typeof team === 'object' ? team._id : team;
}

function getTeamName(notification) {
  const team = notification?.team_id;
  return typeof team === 'object' ? team?.name : null;
}

function scoreInvite(notification, query) {
  const normalizedQuery = query.toLowerCase();
  const teamName = cleanString(getTeamName(notification)).toLowerCase();
  const message = cleanString(notification.message).toLowerCase();

  if (!normalizedQuery) return 1;
  if (teamName === normalizedQuery) return 100;
  if (teamName.includes(normalizedQuery)) return 85;
  if (normalizedQuery.includes(teamName) && teamName) return 75;
  if (message.includes(normalizedQuery)) return 60;
  return 0;
}

async function resolveInvite(args, token) {
  if (args.team_id) {
    return { resolved: true, team_id: cleanString(args.team_id) };
  }

  const response = await axios.get(`${API_URL}/notifications`, {
    headers: buildAuthHeaders(token)
  });

  const invites = (Array.isArray(response.data) ? response.data : [])
    .filter(notification => notification.type === 'team_invite' && !notification.is_read && getTeamId(notification));

  if (invites.length === 0) {
    return { resolved: false, error: 'No pending team invites found.' };
  }

  const query = cleanString(args.query || args.team_name);
  if (!query && invites.length === 1) {
    return { resolved: true, team_id: getTeamId(invites[0]), notification: invites[0] };
  }

  const ranked = invites
    .map(notification => ({ notification, score: scoreInvite(notification, query) }))
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score);

  if (ranked.length === 1 || (ranked.length > 1 && ranked[0].score - ranked[1].score >= 20)) {
    return { resolved: true, team_id: getTeamId(ranked[0].notification), notification: ranked[0].notification };
  }

  const matches = (ranked.length ? ranked : invites.map(notification => ({ notification, score: 0 })))
    .slice(0, 5)
    .map(({ notification }) => ({
      notification_id: notification._id,
      team_id: getTeamId(notification),
      team_name: getTeamName(notification),
      message: notification.message
    }));

  return {
    resolved: false,
    ambiguous: matches.length > 1,
    matches,
    error: query
      ? `I found multiple possible team invites for "${query}".`
      : 'Which team invite should I respond to?'
  };
}

const respondTeamInvite = {
  name: 'respond_team_invite',
  description: 'Accept or reject a pending team invitation by team ID, team name, or invite query.',
  parameters: {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        enum: ['accept', 'reject'],
        description: 'Whether to accept or reject the invite.'
      },
      team_id: {
        type: 'string',
        description: 'Exact team ID when known.'
      },
      team_name: {
        type: 'string',
        description: 'Team name to resolve from pending invites.'
      },
      query: {
        type: 'string',
        description: 'Free-text invite/team query.'
      }
    },
    required: ['action']
  },
  execute: async (args, token) => {
    try {
      const action = String(args.action || '').toLowerCase();
      if (!['accept', 'reject'].includes(action)) {
        return { success: false, error: 'action must be either "accept" or "reject".' };
      }

      const resolved = await resolveInvite(args, token);
      if (!resolved.resolved) {
        return {
          success: false,
          ambiguous: Boolean(resolved.ambiguous),
          matches: resolved.matches || [],
          error: resolved.error
        };
      }

      const endpoint = action === 'accept' ? 'accept-invite' : 'reject-invite';
      const response = await axios.post(`${API_URL}/teams/${resolved.team_id}/${endpoint}`, {}, {
        headers: buildAuthHeaders(token)
      });

      return {
        success: true,
        action,
        team_id: resolved.team_id,
        team_name: getTeamName(resolved.notification),
        message: response.data?.message || `Invite ${action === 'accept' ? 'accepted' : 'rejected'}.`
      };
    } catch (error) {
      return { success: false, error: getApiErrorMessage(error, 'Failed to respond to team invite.') };
    }
  }
};

module.exports = respondTeamInvite;
