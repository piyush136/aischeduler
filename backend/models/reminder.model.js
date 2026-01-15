const mongoose = require('mongoose');

const reminderSchema = new mongoose.Schema({
  task_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task',
    required: true
  },
  remind_at: {
    type: Date,
    required: true
  },
  offset_minutes: {
    type: Number
  },
  status: {
    type: String,
    enum: ['scheduled', 'sent', 'failed'],
    default: 'scheduled'
  }
}, { timestamps: true });

reminderSchema.index({ remind_at: 1 });

module.exports = mongoose.model('Reminder', reminderSchema);
