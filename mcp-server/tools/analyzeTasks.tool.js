const axios = require('axios');
const { getReferenceDate } = require('./utils/dateTime');
const { buildAuthHeaders, getApiErrorMessage } = require('./utils/runtime');

const { BACKEND_API_URL: API_URL } = require('../config/api');

const analyzeTasks = {
  name: 'analyze_tasks',
  description: 'Analyze current tasks and suggest what to do first.',
  parameters: {
    type: 'object',
    properties: {}
  },
  execute: async (args, token) => {
    try {
      const { _meta = {} } = args;
      const response = await axios.get(`${API_URL}/tasks`, {
        headers: buildAuthHeaders(token)
      });

      const allTasks = response.data || [];
      const reference = getReferenceDate(_meta);
      const startOfToday = new Date(reference);
      startOfToday.setHours(0, 0, 0, 0);
      const endOfToday = new Date(startOfToday);
      endOfToday.setHours(23, 59, 59, 999);
      const startOfTomorrow = new Date(startOfToday);
      startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);
      const endOfTomorrow = new Date(startOfTomorrow);
      endOfTomorrow.setHours(23, 59, 59, 999);

      const pending = allTasks.filter(task => task.status !== 'completed');
      const completed = allTasks.filter(task => task.status === 'completed');
      const overdue = pending.filter(task => task.due_at && new Date(task.due_at) < startOfToday);
      const todayTasks = pending.filter(task => task.due_at && new Date(task.due_at) >= startOfToday && new Date(task.due_at) <= endOfToday);
      const tomorrowTasks = pending.filter(task => task.due_at && new Date(task.due_at) >= startOfTomorrow && new Date(task.due_at) <= endOfTomorrow);
      const urgent = pending.filter(task => (task.priority || 3) <= 2);
      const pinned = pending.filter(task => task.isPinned);
      const frequentlyPostponed = pending.filter(task => (task.postponed_count || 0) >= 2);

      const suggestedOrder = [];
      const seen = new Set();
      const pushUnique = (tasks, reason) => {
        tasks.forEach(task => {
          if (!seen.has(String(task._id))) {
            seen.add(String(task._id));
            suggestedOrder.push({
              task_id: task._id,
              title: task.title,
              priority: task.priority,
              due_at: task.due_at,
              status: task.status,
              reason
            });
          }
        });
      };

      pushUnique(overdue.sort((a, b) => new Date(a.due_at) - new Date(b.due_at)), 'OVERDUE');
      pushUnique(pinned.filter(task => todayTasks.includes(task)), 'PINNED');
      pushUnique(urgent.filter(task => todayTasks.includes(task)).sort((a, b) => (a.priority || 3) - (b.priority || 3)), 'URGENT');
      pushUnique(todayTasks.sort((a, b) => (a.priority || 3) - (b.priority || 3)), 'DUE_TODAY');
      pushUnique(tomorrowTasks.sort((a, b) => (a.priority || 3) - (b.priority || 3)), 'DUE_TOMORROW');

      return {
        success: true,
        summary: {
          total_tasks: allTasks.length,
          pending: pending.length,
          completed: completed.length,
          overdue: overdue.length,
          due_today: todayTasks.length,
          due_tomorrow: tomorrowTasks.length,
          urgent: urgent.length,
          pinned: pinned.length,
          frequently_postponed: frequentlyPostponed.length
        },
        alerts: [
          overdue.length > 0 ? `You have ${overdue.length} overdue task(s).` : null,
          urgent.length > 0 ? `${urgent.length} urgent task(s) are pending.` : null,
          frequentlyPostponed.length > 0 ? `${frequentlyPostponed.length} task(s) have been postponed multiple times.` : null,
          pending.length === 0 ? 'All caught up. No pending tasks.' : null
        ].filter(Boolean),
        suggested_order: suggestedOrder.slice(0, 10),
        do_first: suggestedOrder[0] || null,
        message: suggestedOrder[0]
          ? `You should start with "${suggestedOrder[0].title}".`
          : 'No pending tasks to analyze.'
      };
    } catch (error) {
      return { success: false, error: getApiErrorMessage(error, 'Failed to analyze tasks.') };
    }
  }
};

module.exports = analyzeTasks;
