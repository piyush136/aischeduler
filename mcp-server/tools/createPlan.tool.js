const axios = require('axios');
const { normalizeDueAt } = require('./utils/dateTime');
const { buildAuthHeaders, getApiErrorMessage } = require('./utils/runtime');

const API_URL = process.env.BACKEND_URL;

const createPlan = {
  name: "create_plan",
  description: "Create a multi-day plan by breaking a goal into distributed tasks. Use when the user says 'create a plan for...', 'help me plan...', 'break down...' or similar. YOU (the AI) must generate the task list with titles, descriptions, and priorities — then pass them to this tool to distribute across days and create them in bulk.",
  parameters: {
    type: "object",
    properties: {
      goal: {
        type: "string",
        description: "The overall goal or plan name (e.g., 'Exam preparation', 'Learn React', 'Morning routine setup')."
      },
      tasks: {
        type: "array",
        description: "Array of task objects that the AI has generated for this plan. Each task needs at least a title.",
        items: {
          type: "object",
          properties: {
            title: { type: "string", description: "Task title" },
            description: { type: "string", description: "Optional task description" },
            priority: { type: "number", description: "Priority 1-5, default 3" },
            day_offset: { type: "number", description: "Which day to schedule (0=today, 1=tomorrow, 2=day after, etc). If not set, tasks are auto-distributed." }
          },
          required: ["title"]
        }
      },
      num_days: {
        type: "number",
        description: "How many days to spread the plan across (default 7)."
      },
      start_date: {
        type: "string",
        description: "When to start the plan (ISO date or 'today'/'tomorrow'). Default is today."
      },
      default_time: {
        type: "string",
        description: "Default time for tasks if not specified (e.g., '09:00'). Default is '09:00'."
      }
    },
    required: ["goal", "tasks"]
  },
  execute: async (args, token) => {
    try {
      const { _meta = {}, goal, tasks, num_days = 7, start_date, default_time = '09:00' } = args;

      if (!tasks || tasks.length === 0) {
        return { success: false, error: "No tasks provided for the plan. The AI should generate tasks first." };
      }

      console.log(`[MCP] create_plan: "${goal}" with ${tasks.length} tasks over ${num_days} days`);

      // Parse start date
      let startDate = new Date();
      if (start_date) {
        const normalized = normalizeDueAt(start_date, _meta);
        if (normalized.dueAt) {
          startDate = new Date(normalized.dueAt);
        }
      }
      startDate.setHours(0, 0, 0, 0);

      // Parse default time
      const [defaultHours, defaultMinutes] = default_time.split(':').map(Number);

      // Distribute tasks across days
      const tasksToCreate = tasks.map((task, idx) => {
        // Determine which day this task goes on
        let dayOffset;
        if (typeof task.day_offset === 'number') {
          dayOffset = task.day_offset;
        } else {
          // Auto-distribute: spread evenly across num_days
          dayOffset = Math.floor(idx / Math.max(1, Math.ceil(tasks.length / num_days)));
          if (dayOffset >= num_days) dayOffset = num_days - 1;
        }

        const taskDate = new Date(startDate);
        taskDate.setDate(taskDate.getDate() + dayOffset);
        taskDate.setHours(defaultHours || 9, defaultMinutes || 0, 0, 0);

        return {
          title: task.title,
          description: task.description || `Part of plan: ${goal}`,
          priority: task.priority || 3,
          due_at: taskDate.toISOString(),
          has_time: !!(defaultHours),
          tags: ['plan', goal.toLowerCase().replace(/\s+/g, '-')]
        };
      });

      // Create all tasks via bulk endpoint
      const response = await axios.post(`${API_URL}/tasks/bulk`, { tasks: tasksToCreate }, {
        headers: buildAuthHeaders(token)
      });

      const result = response.data;
      const created = result.tasks || result.created || [];

      // Summarize the plan
      const dayMap = {};
      created.forEach(t => {
        const day = new Date(t.due_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        if (!dayMap[day]) dayMap[day] = [];
        dayMap[day].push(t.title);
      });

      const schedule = Object.entries(dayMap).map(([day, titles]) =>
        `${day}: ${titles.join(', ')}`
      ).join('\n');

      return {
        success: true,
        message: `✅ Plan "${goal}" created! ${created.length} tasks distributed over ${Object.keys(dayMap).length} days.`,
        plan: {
          goal,
          total_tasks: created.length,
          days: Object.keys(dayMap).length,
          schedule
        },
        tasks: created.map(t => ({
          task_id: t._id,
          title: t.title,
          due_at: t.due_at,
          priority: t.priority
        }))
      };
    } catch (error) {
      console.error('[MCP] createPlan error:', error.response?.data || error.message);
      return { success: false, error: getApiErrorMessage(error, 'Failed to create plan.') };
    }
  }
};

module.exports = createPlan;
