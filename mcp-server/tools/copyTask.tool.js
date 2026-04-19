const axios = require('axios');
const { resolveTaskId } = require('./utils/fuzzyTaskSearch');
const { buildAuthHeaders, cleanString, ensureArray, getApiErrorMessage } = require('./utils/runtime');

const { BACKEND_API_URL: API_URL } = require('../config/api');

async function resolveTeamId(args, token) {
  if (args.team_id) return { resolved: true, team_id: cleanString(args.team_id) };

  const teamName = cleanString(args.team_name);
  if (!teamName) {
    return { resolved: false, error: 'team_id or team_name is required when copying to a team.' };
  }

  const response = await axios.get(`${API_URL}/teams`, {
    headers: buildAuthHeaders(token)
  });

  const teams = Array.isArray(response.data) ? response.data : [];
  const exact = teams.find(team => cleanString(team.name).toLowerCase() === teamName.toLowerCase());
  if (exact) return { resolved: true, team_id: exact._id, team: exact };

  const matches = teams
    .filter(team => cleanString(team.name).toLowerCase().includes(teamName.toLowerCase()))
    .slice(0, 5);

  if (matches.length === 1) {
    return { resolved: true, team_id: matches[0]._id, team: matches[0] };
  }

  return {
    resolved: false,
    ambiguous: matches.length > 1,
    matches: matches.map(team => ({ team_id: team._id, name: team.name, role: team.role })),
    error: matches.length > 1
      ? `I found multiple teams matching "${teamName}".`
      : `I couldn't find a team named "${teamName}".`
  };
}

async function resolveAssignees(teamId, assigneeQueries, token) {
  const queries = ensureArray(assigneeQueries).map(cleanString).filter(Boolean);
  if (queries.length === 0) return { resolved: true, assigned_to: [] };

  const response = await axios.get(`${API_URL}/teams/${teamId}/members`, {
    headers: buildAuthHeaders(token)
  });

  const members = Array.isArray(response.data) ? response.data : [];
  const assigned = [];
  const failed = [];

  for (const query of queries) {
    const normalized = query.toLowerCase();
    const match = members.find(member =>
      cleanString(member.user_id).toLowerCase() === normalized ||
      cleanString(member.name).toLowerCase() === normalized ||
      cleanString(member.email).toLowerCase() === normalized ||
      cleanString(member.name).toLowerCase().includes(normalized) ||
      cleanString(member.email).toLowerCase().includes(normalized)
    );

    if (match?.user_id) {
      assigned.push(match.user_id);
    } else {
      failed.push(query);
    }
  }

  if (failed.length > 0) {
    return {
      resolved: false,
      error: `Could not resolve assignee${failed.length === 1 ? '' : 's'}: ${failed.join(', ')}.`,
      members: members.slice(0, 10).map(member => ({
        user_id: member.user_id,
        name: member.name,
        email: member.email
      }))
    };
  }

  return { resolved: true, assigned_to: [...new Set(assigned)] };
}

const copyTask = {
  name: 'copy_task',
  description: 'Copy a task to personal tasks or to a team workspace. Supports fuzzy task matching and team/member resolution.',
  parameters: {
    type: 'object',
    properties: {
      task_id: {
        type: 'string',
        description: 'Exact task ID.'
      },
      query: {
        type: 'string',
        description: 'Task title or partial text to resolve.'
      },
      direction: {
        type: 'string',
        enum: ['to_personal', 'to_team'],
        description: 'Where to copy the task.'
      },
      source_team_id: {
        type: 'string',
        description: 'Optional team ID when resolving a team task by query.'
      },
      team_id: {
        type: 'string',
        description: 'Destination team ID for to_team.'
      },
      team_name: {
        type: 'string',
        description: 'Destination team name for to_team.'
      },
      assigned_to: {
        type: 'array',
        items: { type: 'string' },
        description: 'Optional exact user IDs for copied team task assignment.'
      },
      assignee_queries: {
        type: 'array',
        items: { type: 'string' },
        description: 'Optional member names/emails to assign after resolving against team members.'
      }
    },
    required: ['direction']
  },
  execute: async (args, token) => {
    try {
      let taskId = cleanString(args.task_id);
      const direction = String(args.direction || '').toLowerCase();

      if (!['to_personal', 'to_team'].includes(direction)) {
        return { success: false, error: 'direction must be either "to_personal" or "to_team".' };
      }

      if (!taskId) {
        const query = cleanString(args.query);
        if (!query) return { success: false, error: 'task_id or query is required.' };

        const resolved = await resolveTaskId(
          query,
          token,
          args.source_team_id ? { scope: 'team', teamId: args.source_team_id, statusFilter: 'all' } : { statusFilter: 'all' }
        );

        if (!resolved.resolved) {
          return {
            success: false,
            ambiguous: resolved.ambiguous || false,
            matches: resolved.matches || [],
            error: resolved.message || resolved.error
          };
        }

        taskId = resolved.task_id;
      }

      if (direction === 'to_personal') {
        const response = await axios.post(`${API_URL}/tasks/${taskId}/copy-personal`, {}, {
          headers: buildAuthHeaders(token)
        });

        return {
          success: true,
          direction,
          task: response.data,
          message: `Copied "${response.data?.title || 'task'}" to personal tasks.`
        };
      }

      const teamResolution = await resolveTeamId(args, token);
      if (!teamResolution.resolved) {
        return {
          success: false,
          ambiguous: Boolean(teamResolution.ambiguous),
          matches: teamResolution.matches || [],
          error: teamResolution.error
        };
      }

      let assignedTo = ensureArray(args.assigned_to).map(cleanString).filter(Boolean);
      if (assignedTo.length === 0 && ensureArray(args.assignee_queries).length > 0) {
        const assigneeResolution = await resolveAssignees(teamResolution.team_id, args.assignee_queries, token);
        if (!assigneeResolution.resolved) {
          return {
            success: false,
            error: assigneeResolution.error,
            members: assigneeResolution.members || []
          };
        }
        assignedTo = assigneeResolution.assigned_to;
      }

      const response = await axios.post(`${API_URL}/tasks/${taskId}/copy-team`, {
        team_id: teamResolution.team_id,
        assigned_to: assignedTo
      }, {
        headers: buildAuthHeaders(token)
      });

      return {
        success: true,
        direction,
        team_id: teamResolution.team_id,
        team_name: teamResolution.team?.name,
        assigned_to: assignedTo,
        task: response.data,
        message: `Copied "${response.data?.title || 'task'}" to ${teamResolution.team?.name || 'the team'}.`
      };
    } catch (error) {
      return { success: false, error: getApiErrorMessage(error, 'Failed to copy task.') };
    }
  }
};

module.exports = copyTask;
