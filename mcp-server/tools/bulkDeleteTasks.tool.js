const axios = require('axios');
const { getReferenceDate } = require('./utils/dateTime');
const { buildAuthHeaders, getApiErrorMessage } = require('./utils/runtime');

const { BACKEND_API_URL: API_URL } = require('../config/api');

function dayStart(referenceDate) {
  const start = new Date(referenceDate);
  start.setHours(0, 0, 0, 0);
  return start;
}

function sortTasks(tasks, sort) {
  const order = String(sort || 'recent').toLowerCase();
  const sorted = [...tasks];

  if (order === 'oldest') {
    return sorted.sort((a, b) => new Date(a.created_at || a.updated_at || 0) - new Date(b.created_at || b.updated_at || 0));
  }

  if (order === 'due') {
    return sorted.sort((a, b) => {
      if (a.due_at && b.due_at) return new Date(a.due_at) - new Date(b.due_at);
      if (a.due_at) return -1;
      if (b.due_at) return 1;
      return new Date(b.created_at || b.updated_at || 0) - new Date(a.created_at || a.updated_at || 0);
    });
  }

  if (order === 'priority') {
    return sorted.sort((a, b) => (a.priority || 3) - (b.priority || 3));
  }

  return sorted.sort((a, b) => new Date(b.created_at || b.updated_at || 0) - new Date(a.created_at || a.updated_at || 0));
}

function filterTasks(tasks, filter, meta) {
  const selectedFilter = String(filter || 'pending').toLowerCase();
  const today = dayStart(getReferenceDate(meta));

  switch (selectedFilter) {
    case 'overdue':
      return tasks.filter(task => task.status !== 'completed' && task.due_at && new Date(task.due_at) < today);
    case 'completed':
      return tasks.filter(task => task.status === 'completed');
    case 'all':
      return tasks;
    case 'pending':
    case 'recent_pending':
    default:
      return tasks.filter(task => task.status !== 'completed');
  }
}

const bulkDeleteTasks = {
  name: 'bulk_delete_tasks',
  description: 'Delete a limited batch of personal tasks by filter, such as the last 10 pending tasks or 5 overdue tasks. Use get_tasks when the user only wants to view tasks.',
  parameters: {
    type: 'object',
    properties: {
      filter: {
        type: 'string',
        enum: ['pending', 'recent_pending', 'overdue', 'completed', 'all'],
        description: 'Which tasks to select before deletion.'
      },
      limit: {
        type: 'number',
        description: 'Required number of tasks to delete. Maximum 50.'
      },
      sort: {
        type: 'string',
        enum: ['recent', 'oldest', 'due', 'priority'],
        description: 'Selection order. Use recent for requests like "last 10 pending tasks".'
      },
      preview_only: {
        type: 'boolean',
        description: 'If true, show which tasks would be deleted without deleting them.'
      }
    },
    required: ['limit']
  },
  execute: async (args, token) => {
    try {
      const { _meta = {} } = args;
      const requestedLimit = Number(args.limit);
      if (!Number.isFinite(requestedLimit) || requestedLimit < 1) {
        return { success: false, error: 'A positive limit is required for bulk deletion.' };
      }

      const limit = Math.min(Math.floor(requestedLimit), 50);
      const filter = String(args.filter || 'pending').toLowerCase();
      const sort = String(args.sort || (filter === 'recent_pending' ? 'recent' : 'recent')).toLowerCase();

      const response = await axios.get(`${API_URL}/tasks`, {
        headers: buildAuthHeaders(token)
      });

      const selected = sortTasks(filterTasks(response.data || [], filter, _meta), sort).slice(0, limit);
      const taskSummaries = selected.map((task, index) => ({
        index: index + 1,
        task_id: task._id,
        title: task.title,
        status: task.status,
        due_at: task.due_at,
        priority: task.priority,
        created_at: task.created_at
      }));

      if (selected.length === 0) {
        return {
          success: true,
          deletedCount: 0,
          tasks: [],
          message: `No ${filter.replace('_', ' ')} tasks found to delete.`
        };
      }

      if (args.preview_only === true) {
        return {
          success: true,
          preview: true,
          count: taskSummaries.length,
          tasks: taskSummaries,
          message: `Preview: ${taskSummaries.length} task(s) would be deleted.`
        };
      }

      const deleted = [];
      const failed = [];

      for (const task of selected) {
        try {
          await axios.delete(`${API_URL}/tasks/${task._id}`, {
            headers: buildAuthHeaders(token)
          });
          deleted.push({
            task_id: task._id,
            title: task.title,
            status: task.status,
            due_at: task.due_at,
            created_at: task.created_at
          });
        } catch (error) {
          failed.push({
            task_id: task._id,
            title: task.title,
            error: getApiErrorMessage(error, 'Failed to delete task.')
          });
        }
      }

      return {
        success: failed.length === 0,
        deletedCount: deleted.length,
        failedCount: failed.length,
        deleted,
        failed,
        message: failed.length
          ? `Deleted ${deleted.length} task(s), but ${failed.length} failed.`
          : `Deleted ${deleted.length} task(s).`
      };
    } catch (error) {
      return { success: false, error: getApiErrorMessage(error, 'Failed to bulk delete tasks.') };
    }
  }
};

module.exports = bulkDeleteTasks;
