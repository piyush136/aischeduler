const axios = require('axios');
const { getReferenceDate } = require('./utils/dateTime');
const { buildAuthHeaders, getApiErrorMessage } = require('./utils/runtime');

const { BACKEND_API_URL: API_URL } = require('../config/api');

function dayRangeFromReference(referenceDate, offsetDays = 0) {
  const start = new Date(referenceDate);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() + offsetDays);

  const end = new Date(start);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

const getTasks = {
  name: 'get_tasks',
  description: 'Get tasks using smart filters like today, tomorrow, overdue, pending, completed, week, or all.',
  parameters: {
    type: 'object',
    properties: {
      filter: {
        type: 'string',
        enum: ['today', 'tomorrow', 'overdue', 'pending', 'completed', 'week', 'recent', 'all']
      },
      limit: {
        type: 'number',
        description: 'Optional maximum number of tasks to return, useful for requests like "5 recent tasks".'
      }
    }
  },
  execute: async (args, token) => {
    try {
      const { _meta = {} } = args;
      const filter = String(args.filter || 'today').toLowerCase();
      const requestedLimit = Number(args.limit);
      const limit = Number.isFinite(requestedLimit) && requestedLimit > 0
        ? Math.min(Math.floor(requestedLimit), 50)
        : null;
      const response = await axios.get(`${API_URL}/tasks`, {
        headers: buildAuthHeaders(token)
      });

      const allTasks = response.data || [];
      const reference = getReferenceDate(_meta);
      const today = dayRangeFromReference(reference, 0);
      const tomorrow = dayRangeFromReference(reference, 1);
      const weekEnd = new Date(today.start);
      weekEnd.setDate(weekEnd.getDate() + (7 - weekEnd.getDay()));
      weekEnd.setHours(23, 59, 59, 999);

      let filtered = [];
      let label = filter;
      let preserveOrder = false;

      switch (filter) {
        case 'today':
          filtered = allTasks.filter(task => task.due_at && new Date(task.due_at) >= today.start && new Date(task.due_at) <= today.end);
          label = 'today';
          break;
        case 'tomorrow':
          filtered = allTasks.filter(task => task.due_at && new Date(task.due_at) >= tomorrow.start && new Date(task.due_at) <= tomorrow.end);
          label = 'tomorrow';
          break;
        case 'overdue':
          filtered = allTasks.filter(task => task.status !== 'completed' && task.due_at && new Date(task.due_at) < today.start);
          label = 'overdue';
          break;
        case 'pending':
          filtered = allTasks.filter(task => task.status !== 'completed');
          label = 'pending';
          break;
        case 'completed':
          filtered = allTasks.filter(task => task.status === 'completed');
          label = 'completed';
          break;
        case 'week':
          filtered = allTasks.filter(task => task.due_at && new Date(task.due_at) >= today.start && new Date(task.due_at) <= weekEnd);
          label = 'this week';
          break;
        case 'recent':
          filtered = allTasks
            .filter(task => task.status !== 'completed')
            .sort((a, b) => new Date(b.created_at || b.updated_at || 0) - new Date(a.created_at || a.updated_at || 0));
          label = 'recent';
          preserveOrder = true;
          break;
        case 'all':
        default:
          filtered = allTasks;
          label = 'all';
          break;
      }

      if (!preserveOrder) {
        filtered.sort((a, b) => {
          if (a.isPinned && !b.isPinned) return -1;
          if (!a.isPinned && b.isPinned) return 1;
          if ((a.priority || 3) !== (b.priority || 3)) return (a.priority || 3) - (b.priority || 3);
          if (a.due_at && b.due_at) return new Date(a.due_at) - new Date(b.due_at);
          if (a.due_at) return -1;
          if (b.due_at) return 1;
          return a.title.localeCompare(b.title);
        });
      }

      if (limit) {
        filtered = filtered.slice(0, limit);
      }

      const tasks = filtered.map((task, index) => ({
        index: index + 1,
        task_id: task._id,
        title: task.title,
        status: task.status,
        priority: task.priority,
        due_at: task.due_at,
        has_time: task.has_time,
        isPinned: Boolean(task.isPinned),
        postponed_count: task.postponed_count || 0,
        subtask_count: task.subtasks?.length || 0,
        created_at: task.created_at,
        updated_at: task.updated_at
      }));

      const overdueCount = allTasks.filter(task => task.status !== 'completed' && task.due_at && new Date(task.due_at) < today.start).length;

      return {
        success: true,
        filter,
        count: tasks.length,
        tasks,
        message: tasks.length === 0 ? `No ${label} tasks found.` : `Found ${tasks.length} ${label} task${tasks.length === 1 ? '' : 's'}.`,
        overdueAlert: overdueCount > 0 ? `You have ${overdueCount} overdue task(s).` : null
      };
    } catch (error) {
      return { success: false, error: getApiErrorMessage(error, 'Failed to fetch tasks.') };
    }
  }
};

module.exports = getTasks;
