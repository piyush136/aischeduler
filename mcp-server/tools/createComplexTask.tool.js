const axios = require('axios');

const { BACKEND_API_URL: API_URL } = require('../config/api');

const createComplexTask = {
  name: "create_complex_task",
  description: "Create a complex task with multiple steps, plans, routines, or schedules",
  parameters: {
    type: "object",
    properties: {
      title: {
        type: "string",
        description: "The title of the complex task or plan (e.g., 'Morning Exercise Routine', '30-Minute Workout Plan')"
      },
      description: {
        type: "string",
        description: "Detailed description with step-by-step breakdown (e.g., 'Step 1: Warm-up (5 min)\\nStep 2: Cardio (15 min)\\nStep 3: Cool-down (10 min)')"
      },
      due_at: {
        type: "string",
        description: "ISO-8601 datetime string for when the task starts (e.g., 2026-01-19T07:00:00)"
      },
      priority: {
        type: "number",
        description: "Priority level (1=high, 3=normal, 5=low, default 3)"
      },
      duration_minutes: {
        type: "number",
        description: "Total duration in minutes (e.g., 30 for 30-minute plan)"
      },
      recurrence: {
        type: "string",
        enum: ["NONE", "DAILY", "EVERY_WEEK", "EVERY_MONTH"],
        description: "How often this plan repeats (default: ONCE)"
      },
      tags: {
        type: "array",
        items: { type: "string" },
        description: "Tags to categorize the task (e.g., ['exercise', 'health', 'routine'])"
      }
    },
    required: ["title", "description", "due_at"]
  },
  execute: async (args, token) => {
    try {
      console.log('[createComplexTask] Received args:', args);
      
      // Validate due_at
      if (args.due_at) {
        const dueDate = new Date(args.due_at);
        if (isNaN(dueDate.getTime())) {
          return { success: false, error: `Invalid date format: ${args.due_at}` };
        }
        console.log('[createComplexTask] Valid date:', args.due_at);
      }

      // Set defaults
      const taskData = {
        title: args.title || 'Complex Task',
        description: args.description || '',
        due_at: args.due_at,
        priority: args.priority || 3,
        duration_minutes: args.duration_minutes || 60,
        recurrence: args.recurrence || 'NONE',
        tags: args.tags || [],
        is_complex: true, // Mark as complex task for special handling
        is_recurring: (args.recurrence && args.recurrence !== 'NONE')
      };

      console.log('[createComplexTask] Sending to backend:', taskData);

      const response = await axios.post(`${API_URL}/tasks`, taskData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log('[createComplexTask] Task created successfully:', response.data._id);
      return { 
        success: true, 
        task: response.data,
        message: `Created complex task: ${args.title} (${args.duration_minutes} minutes)`
      };
    } catch (error) {
      console.error('[createComplexTask] Error:', error.message);
      console.error('[createComplexTask] Response data:', error.response?.data);
      return { 
        success: false, 
        error: error.response?.data?.error || error.message 
      };
    }
  }
};

module.exports = createComplexTask;
