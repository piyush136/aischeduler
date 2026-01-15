const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
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
  priority: {
    type: Number,
    default: 3
  },
  status: {
    type: String,
    enum: ['pending', 'completed'],
    default: 'pending'
  },
  is_recurring: {
    type: Boolean,
    default: false
  },
  recurrence: {
    type: String, // 'DAILY', 'WEEKLY', 'MONTHLY' or null
    default: null
  }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

// Index for getting tasks by user and date
taskSchema.index({ user_id: 1, due_at: 1 });

module.exports = mongoose.model('Task', taskSchema);
