const mongoose = require('mongoose');

const teamMessageSchema = new mongoose.Schema({
  team_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: true
  },
  sender_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  recipient_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  conversation_type: {
    type: String,
    enum: ['direct', 'team'],
    default: 'direct'
  },
  body: {
    type: String,
    required: true,
    trim: true,
    maxlength: 2000
  }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

teamMessageSchema.index({ team_id: 1, sender_id: 1, recipient_id: 1, created_at: -1 });
teamMessageSchema.index({ team_id: 1, recipient_id: 1, created_at: -1 });
teamMessageSchema.index({ team_id: 1, conversation_type: 1, created_at: -1 });

module.exports = mongoose.model('TeamMessage', teamMessageSchema);
