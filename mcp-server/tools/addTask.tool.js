const axios = require('axios');
const { normalizeDueAt, isPastDue } = require('./utils/dateTime');
const {
  buildAuthHeaders,
  cleanString,
  ensureArray,
  getApiErrorMessage
} = require('./utils/runtime');

const { BACKEND_API_URL: API_URL } = require('../config/api');

const convertRecurrenceToRepeat = recurrence => {
  if (!recurrence || recurrence === 'NONE') return 'never';
  if (/DAILY/.test(recurrence)) return 'daily';
  if (/WEEK/.test(recurrence)) return 'weekly';
  if (/MONTH/.test(recurrence)) return 'monthly';
  if (/YEAR/.test(recurrence)) return 'yearly';
  return 'never';
};

const isOutdoorActivity = (title, description) => {
  const outdoorKeywords = /run|jog|walk|bike|cycle|hike|garden|park|outdoor|playground|wash\s+car|football|cricket|tennis|golf|swimming|pool/i;
  return outdoorKeywords.test(title) || outdoorKeywords.test(description || '');
};

const extractPriority = text => {
  if (/URGENT|ASAP|IMMEDIATELY|HIGH.PRIORITY|CRITICAL|EMERGENCY/i.test(text || '')) return 1;
  if (/LOW.PRIORITY|EVENTUALLY|WHEN.POSSIBLE|WHENEVER/i.test(text || '')) return 5;
  return 3;
};

const generateTitle = message => {
  const cleanMessage = String(message || '')
    .replace(/add a task|create a task|create a|make a|do a|remind me|add|create/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const words = cleanMessage.split(' ').filter(word => word.length > 1);
  const title = words.slice(0, 5).join(' ').trim();
  return title || 'Task';
};

const extractLocation = text => {
  if (!text) return null;
  const match = text.match(/(?:at|near|in|to|arrive\s+at|reach)\s+([^,.]+?)(?:\s+(?:tomorrow|today|at|on|next|this|for|in)|$)/i);
  return match ? match[1].trim() : null;
};

const extractRecurrence = text => {
  const normalized = String(text || '').toUpperCase();
  if (/EVERY\s+DAY|DAILY|EACH\s+DAY|ALL\s+DAYS/.test(normalized)) return 'DAILY';
  if (/EVERY\s+WEEKDAY|WEEKDAYS|MONDAY\s+TO\s+FRIDAY|WORK\s+DAY/.test(normalized)) return 'WEEKDAYS';
  if (/EVERY\s+WEEKEND|WEEKENDS|SATURDAY\s+AND\s+SUNDAY/.test(normalized)) return 'WEEKENDS';
  if (/EVERY\s+MONDAY/.test(normalized)) return 'EVERY_MONDAY';
  if (/EVERY\s+TUESDAY/.test(normalized)) return 'EVERY_TUESDAY';
  if (/EVERY\s+WEDNESDAY/.test(normalized)) return 'EVERY_WEDNESDAY';
  if (/EVERY\s+THURSDAY/.test(normalized)) return 'EVERY_THURSDAY';
  if (/EVERY\s+FRIDAY/.test(normalized)) return 'EVERY_FRIDAY';
  if (/EVERY\s+SATURDAY/.test(normalized)) return 'EVERY_SATURDAY';
  if (/EVERY\s+SUNDAY/.test(normalized)) return 'EVERY_SUNDAY';
  if (/EVERY\s+2\s+DAY|EVERY\s+TWO\s+DAY/.test(normalized)) return 'EVERY_2_DAYS';
  if (/EVERY\s+3\s+DAY|EVERY\s+THREE\s+DAY/.test(normalized)) return 'EVERY_3_DAYS';
  if (/EVERY\s+WEEK(?!DAY)|WEEKLY|ONCE\s+A\s+WEEK/.test(normalized)) return 'EVERY_WEEK';
  if (/EVERY\s+2\s+WEEK|EVERY\s+OTHER\s+WEEK/.test(normalized)) return 'EVERY_2_WEEKS';
  if (/EVERY\s+MONTH|MONTHLY|ONCE\s+A\s+MONTH/.test(normalized)) return 'EVERY_MONTH';
  if (/EVERY\s+3\s+MONTH/.test(normalized)) return 'EVERY_3_MONTHS';
  if (/EVERY\s+6\s+MONTH/.test(normalized)) return 'EVERY_6_MONTHS';
  if (/EVERY\s+YEAR|YEARLY|ANNUALLY|ONCE\s+A\s+YEAR/.test(normalized)) return 'EVERY_YEAR';
  return 'NONE';
};

function normalizeSubtasks(subtasks) {
  return ensureArray(subtasks)
    .map(subtask => (typeof subtask === 'string' ? { title: subtask.trim() } : { title: cleanString(subtask?.title) }))
    .filter(subtask => subtask.title);
}

const addTask = {
  name: 'add_task',
  description: 'Create a new task with robust date parsing, fuzzy natural language handling, optional subtasks, team assignment, and conflict detection.',
  parameters: {
    type: 'OBJECT',
    properties: {
      title: {
        type: 'STRING',
        description: 'Task title.'
      },
      due_at: {
        type: 'STRING',
        description: 'Natural language or ISO datetime, such as "tomorrow at 5 PM", "later", or "2026-01-19T17:00:00".'
      },
      priority: {
        type: 'NUMBER',
        description: 'Priority level (1=high, 3=normal, 5=low).'
      },
      has_time: {
        type: 'BOOLEAN',
        description: 'False if this task should stay date-only with no specific time.'
      },
      recurrence: {
        type: 'STRING',
        enum: ['NONE', 'DAILY', 'WEEKDAYS', 'WEEKENDS', 'EVERY_MONDAY', 'EVERY_TUESDAY', 'EVERY_WEDNESDAY', 'EVERY_THURSDAY', 'EVERY_FRIDAY', 'EVERY_SATURDAY', 'EVERY_SUNDAY', 'EVERY_2_DAYS', 'EVERY_3_DAYS', 'EVERY_WEEK', 'EVERY_2_WEEKS', 'EVERY_MONTH', 'EVERY_3_MONTHS', 'EVERY_6_MONTHS', 'EVERY_YEAR']
      },
      recurrence_end_date: {
        type: 'STRING',
        description: 'Optional end date for recurrence.'
      },
      description: {
        type: 'STRING',
        description: 'Optional task description.'
      },
      location: {
        type: 'STRING',
        description: 'Location name for this task.'
      },
      subtasks: {
        type: 'ARRAY',
        items: {
          type: 'OBJECT',
          properties: {
            title: { type: 'STRING' }
          }
        }
      },
      duration_minutes: {
        type: 'NUMBER',
        description: 'Optional task duration in minutes.'
      },
      team_id: {
        type: 'STRING',
        description: 'Optional team ID when creating a team task.'
      },
      assigned_to: {
        type: 'ARRAY',
        items: { type: 'STRING' },
        description: 'Optional list of user IDs to assign this task to.'
      },
      tags: {
        type: 'ARRAY',
        items: { type: 'STRING' }
      },
      force: {
        type: 'BOOLEAN',
        default: false,
        description: 'If true, create even if a conflict is detected.'
      }
    },
    required: ['title']
  },
  execute: async (args, token) => {
    try {
      const { _meta = {}, force = false } = args;
      const description = cleanString(args.description);
      const title = cleanString(args.title) || generateTitle(description);

      if (!title) {
        return { success: false, error: 'Task title is required.' };
      }

      const normalizedDate = normalizeDueAt(args.due_at, _meta);
      if (args.due_at && !normalizedDate.dueAt) {
        return {
          success: false,
          error: normalizedDate.error || `Could not understand the date/time "${args.due_at}".`
        };
      }

      const hasTime = typeof args.has_time === 'boolean' ? args.has_time : normalizedDate.hasTime;
      const dueAt = normalizedDate.dueAt;

      if (dueAt && isPastDue(dueAt, _meta, { hasTime })) {
        return {
          success: false,
          error: `I can't create "${title}" in the past. Please choose a current or future time.`
        };
      }

      let priority = Number.isFinite(args.priority) ? args.priority : extractPriority(`${title} ${description}`);
      if (!Number.isFinite(priority) || priority < 1 || priority > 5) priority = 3;

      const recurrenceValue = args.recurrence || extractRecurrence(`${title} ${description}`);
      const taskData = {
        title,
        description: description || undefined,
        due_at: dueAt || undefined,
        has_time: dueAt ? hasTime : false,
        priority,
        recurrence: recurrenceValue,
        recurrence_end_date: cleanString(args.recurrence_end_date) || undefined,
        repeat: convertRecurrenceToRepeat(recurrenceValue),
        subtasks: normalizeSubtasks(args.subtasks),
        duration_minutes: Number.isFinite(args.duration_minutes) ? args.duration_minutes : undefined,
        team_id: cleanString(args.team_id) || undefined,
        assigned_to: ensureArray(args.assigned_to).filter(Boolean),
        tags: ensureArray(args.tags).map(tag => cleanString(tag)).filter(Boolean)
      };

      if (taskData.assigned_to.length === 0) delete taskData.assigned_to;
      if (taskData.subtasks.length === 0) delete taskData.subtasks;
      if (taskData.tags.length === 0) delete taskData.tags;

      if (dueAt && hasTime && !force) {
        try {
          const conflictRes = await axios.get(`${API_URL}/tasks/check-conflict`, {
            params: { startTime: dueAt },
            headers: buildAuthHeaders(token)
          });

          if (conflictRes.data.conflict) {
            return {
              success: false,
              conflict: true,
              message: conflictRes.data.message,
              details: 'Ask the user whether to reschedule or force creation.'
            };
          }
        } catch (conflictError) {
          console.error('[addTask] Conflict check failed:', conflictError.message);
        }
      }

      const locationName = cleanString(args.location) || extractLocation(description);
      if (locationName) {
        try {
          const geoRes = await axios.get(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locationName)}&limit=1`,
            { headers: { 'User-Agent': 'AI-Task-Manager/1.0' } }
          );

          if (geoRes.data?.length > 0) {
            taskData.location = {
              name: locationName,
              coordinates: {
                lat: parseFloat(geoRes.data[0].lat),
                lng: parseFloat(geoRes.data[0].lon)
              },
              radius: 200
            };
          } else {
            taskData.location = { name: locationName };
          }
        } catch (geoError) {
          console.error('[addTask] Geocoding error:', geoError.message);
          taskData.location = { name: locationName };
        }
      }

      if (!force && dueAt && taskData.location?.coordinates && isOutdoorActivity(title, description)) {
        try {
          const { lat, lng } = taskData.location.coordinates;
          const weatherRes = await axios.get('https://api.open-meteo.com/v1/forecast', {
            params: {
              latitude: lat,
              longitude: lng,
              hourly: 'precipitation_probability,weathercode',
              timezone: 'auto'
            }
          });

          const targetHour = `${dueAt.slice(0, 13)}:00`;
          const index = weatherRes.data.hourly.time.findIndex(time => time.startsWith(targetHour));
          if (index !== -1) {
            const precipitation = weatherRes.data.hourly.precipitation_probability[index];
            const weatherCode = weatherRes.data.hourly.weathercode[index];
            if (precipitation > 40 || weatherCode >= 51) {
              return {
                success: false,
                weatherConflict: true,
                message: `Weather may be poor for "${title}" at ${locationName}.`,
                details: `Forecast shows ${precipitation}% precipitation probability at that time.`
              };
            }
          }
        } catch (weatherError) {
          console.error('[addTask] Weather check failed:', weatherError.message);
        }
      }

      Object.keys(taskData).forEach(key => {
        if (taskData[key] === undefined) {
          delete taskData[key];
        }
      });

      const response = await axios.post(`${API_URL}/tasks`, taskData, {
        headers: buildAuthHeaders(token)
      });

      return {
        success: true,
        task: response.data,
        message: dueAt
          ? `Task "${response.data.title}" created${hasTime ? ` for ${dueAt}` : ' without a fixed time'}.`
          : `Task "${response.data.title}" created without a due date, so it will not appear in today tasks until you schedule it.`,
        extracted: {
          title,
          priority,
          due_at: dueAt,
          has_time: hasTime
        }
      };
    } catch (error) {
      console.error('[addTask] Error:', error.response?.data || error.message);
      return { success: false, error: getApiErrorMessage(error, 'Failed to create task.') };
    }
  }
};

module.exports = addTask;
