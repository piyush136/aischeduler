const axios = require('axios');
const { getReferenceDate, isPastDue, normalizeDueAt, toLocalISOString } = require('./utils/dateTime');
const { buildAuthHeaders, getApiErrorMessage } = require('./utils/runtime');

const { BACKEND_API_URL: API_URL } = require('../config/api');

const createPlan = {
  name: 'create_plan',
  description: "Create a multi-day plan by breaking a goal into distributed tasks. Use when the user says 'create a plan for...', 'help me plan...', 'break down...' or similar. The AI must generate the task list with titles, descriptions, and priorities, then pass them to this tool to distribute across days and create them in bulk.",
  parameters: {
    type: 'object',
    properties: {
      goal: {
        type: 'string',
        description: "The overall goal or plan name, such as 'Exam preparation', 'Learn React', or 'Morning routine setup'."
      },
      tasks: {
        type: 'array',
        description: 'Array of task objects that the AI has generated for this plan. Each task needs at least a title.',
        items: {
          type: 'object',
          properties: {
            title: { type: 'string', description: 'Task title' },
            description: { type: 'string', description: 'Optional task description' },
            priority: { type: 'number', description: 'Priority 1-5, default 3' },
            day_offset: { type: 'number', description: 'Which day to schedule, where 0=today, 1=tomorrow, etc. If not set, tasks are auto-distributed.' }
          },
          required: ['title']
        }
      },
      num_days: {
        type: 'number',
        description: 'How many days to spread the plan across. Default 7.'
      },
      start_date: {
        type: 'string',
        description: "When to start the plan, such as an ISO date, 'today', or 'tomorrow'. Default is today."
      },
      default_time: {
        type: 'string',
        description: "Default time for tasks if not specified, such as '09:00'. Default is '09:00'."
      }
    },
    required: ['goal', 'tasks']
  },
  execute: async (args, token) => {
    try {
      const { _meta = {}, goal, tasks, num_days = 7, start_date, default_time = '09:00' } = args;

      if (!Array.isArray(tasks) || tasks.length === 0) {
        return { success: false, error: 'No tasks provided for the plan. The AI should generate tasks first.' };
      }

      console.log(`[MCP] create_plan: "${goal}" with ${tasks.length} tasks over ${num_days} days`);

      const referenceDate = getReferenceDate(_meta);
      let startDate = new Date(referenceDate);
      if (start_date) {
        const normalized = normalizeDueAt(start_date, _meta);
        if (normalized.dueAt) {
          startDate = new Date(normalized.dueAt);
        }
      }
      startDate.setHours(0, 0, 0, 0);

      const [defaultHours, defaultMinutes] = String(default_time || '09:00').split(':').map(Number);
      const planHasTime = Number.isFinite(defaultHours);

      const tasksToCreate = tasks.map((task, idx) => {
        let dayOffset;
        if (typeof task.day_offset === 'number') {
          dayOffset = task.day_offset;
        } else {
          dayOffset = Math.floor(idx / Math.max(1, Math.ceil(tasks.length / num_days)));
          if (dayOffset >= num_days) dayOffset = num_days - 1;
        }

        const taskDate = new Date(startDate);
        taskDate.setDate(taskDate.getDate() + dayOffset);
        taskDate.setHours(defaultHours || 9, defaultMinutes || 0, 0, 0);

        if (isPastDue(toLocalISOString(taskDate), _meta, { hasTime: planHasTime })) {
          taskDate.setTime(referenceDate.getTime());
          taskDate.setMinutes(taskDate.getMinutes() + 60, 0, 0);
        }

        return {
          title: task.title,
          description: task.description || `Part of plan: ${goal}`,
          priority: task.priority || 3,
          due_at: toLocalISOString(taskDate),
          has_time: planHasTime,
          tags: ['plan', String(goal || 'plan').toLowerCase().replace(/\s+/g, '-')]
        };
      });

      const response = await axios.post(`${API_URL}/tasks/bulk`, { tasks: tasksToCreate }, {
        headers: buildAuthHeaders(token)
      });

      const result = response.data || {};
      const created = result.tasks || result.created || [];
      const failed = result.errors || result.failed || [];

      if (created.length === 0) {
        return {
          success: false,
          error: failed.length > 0
            ? `No plan tasks were created. First error: ${failed[0].error || failed[0].details || 'Unknown error'}`
            : 'No plan tasks were created.',
          failed
        };
      }

      const dayMap = {};
      created.forEach(task => {
        const day = new Date(task.due_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        if (!dayMap[day]) dayMap[day] = [];
        dayMap[day].push(task.title);
      });

      const schedule = Object.entries(dayMap)
        .map(([day, titles]) => `${day}: ${titles.join(', ')}`)
        .join('\n');

      return {
        success: true,
        message: `Plan "${goal}" created. ${created.length} task${created.length === 1 ? '' : 's'} distributed over ${Object.keys(dayMap).length} day${Object.keys(dayMap).length === 1 ? '' : 's'}${failed.length ? `; ${failed.length} failed.` : '.'}`,
        plan: {
          goal,
          total_tasks: created.length,
          days: Object.keys(dayMap).length,
          schedule,
          failed
        },
        tasks: created.map(task => ({
          task_id: task._id,
          title: task.title,
          due_at: task.due_at,
          priority: task.priority
        }))
      };
    } catch (error) {
      console.error('[MCP] createPlan error:', error.response?.data || error.message);
      return { success: false, error: getApiErrorMessage(error, 'Failed to create plan.') };
    }
  }
};

module.exports = createPlan;
