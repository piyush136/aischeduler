const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Team collaboration fields
  team_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    default: null,
    description: 'If set, this is a team task; if null, personal task'
  },
  assigned_to: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    description: 'Team members this task is assigned to. Empty means all team members.'
  }],
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
    description: 'User who created this task'
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  due_at: {
    type: Date
  },
  has_time: {
    type: Boolean,
    default: true
  },
  priority: {
    type: Number,
    default: 3,
    min: 1,
    max: 5
  },
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'completed'],
    default: 'pending'
  },
  isPinned: {
    type: Boolean,
    default: false
  },
  is_recurring: {
    type: Boolean,
    default: false
  },
  recurrence: {
    type: String,
    enum: ['NONE', 'DAILY', 'WEEKDAYS', 'WEEKENDS', 'EVERY_MONDAY', 'EVERY_TUESDAY', 'EVERY_WEDNESDAY', 'EVERY_THURSDAY', 'EVERY_FRIDAY', 'EVERY_SATURDAY', 'EVERY_SUNDAY', 'EVERY_2_DAYS', 'EVERY_3_DAYS', 'EVERY_WEEK', 'EVERY_2_WEEKS', 'EVERY_MONTH', 'EVERY_3_MONTHS', 'EVERY_6_MONTHS', 'EVERY_YEAR'],
    default: 'NONE'
  },
  recurrence_pattern: {
    type: String,
    description: 'Human-readable recurrence pattern (e.g., "Every weekday at 9:00 AM")',
    default: null
  },
  recurrence_end_date: {
    type: Date,
    description: 'When the recurrence should stop',
    default: null
  },
  next_occurrence: {
    type: Date,
    description: 'Next scheduled occurrence for recurring tasks',
    default: null
  },
  // NEW: Fields for complex tasks (plans, routines, schedules)
  is_complex: {
    type: Boolean,
    default: false
  },
  duration_minutes: {
    type: Number,
    default: null
  },
  tags: {
    type: [String],
    default: []
  },
  location: {
    name: {
      type: String,
      default: null
    },
    coordinates: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null }
    },
    radius: {
      type: Number,
      default: 200
    }
  },
  // Postpone tracking
  postponed_count: {
    type: Number,
    default: 0,
    description: 'Number of times this task has been postponed'
  },
  original_due_at: {
    type: Date,
    default: null,
    description: 'The original due date before first postponement'
  },
  // Google Calendar sync id for the event (if synced)
  googleEventId: {
    type: String,
    default: undefined,
    description: 'Google Calendar Event ID for synced tasks'
  },
  // Recurrence settings
  repeat: {
    type: String,
    enum: ['never', 'daily', 'weekly', 'monthly', 'yearly'],
    default: 'never'
  },
  email_reminder_sent: {
    type: Boolean,
    default: false
  },
  // Sub-tasks
  subtasks: [
    {
      _id: mongoose.Schema.Types.ObjectId,
      title: String,
      status: {
        type: String,
        enum: ['pending', 'completed'],
        default: 'pending'
      },
      created_at: {
        type: Date,
        default: Date.now
      }
    }
  ],
  comments: [
    {
      _id: mongoose.Schema.Types.ObjectId,
      user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
      body: {
        type: String,
        required: true,
        trim: true,
        maxlength: 2000
      },
      created_at: {
        type: Date,
        default: Date.now
      }
    }
  ]
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

// Index for getting tasks by user and date
taskSchema.index({ user_id: 1, due_at: 1 });
// Ensure a user cannot have duplicate tasks pointing to the same Google event.
// Only real string event IDs are indexed; unsynced tasks omit googleEventId.
taskSchema.index(
  { user_id: 1, googleEventId: 1 },
  { unique: true, partialFilterExpression: { googleEventId: { $type: 'string' } } }
);
// Index for team tasks
taskSchema.index({ team_id: 1, assigned_to: 1 });
taskSchema.index({ user_id: 1, status: 1, due_at: 1 });

module.exports = mongoose.model('Task', taskSchema);
