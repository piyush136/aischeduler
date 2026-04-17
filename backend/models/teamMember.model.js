const mongoose = require('mongoose');

const teamMemberSchema = new mongoose.Schema({
  team_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: true
  },
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  role: {
    type: String,
    enum: ['admin', 'member'],
    default: 'member'
  },
  status: {
    type: String,
    enum: ['pending', 'active'],
    default: 'pending' // new members must accept an invite
  },
  can_add_task: {
    type: Boolean,
    default: true,
    description: 'Whether this member can create tasks in the team'
  },
  can_edit_task: {
    type: Boolean,
    default: true,
    description: 'Whether this member can edit tasks in the team'
  },
  joined_at: {
    type: Date,
    default: Date.now
  }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

// A user can only be a member of a team once
teamMemberSchema.index({ team_id: 1, user_id: 1 }, { unique: true });
// Fast lookup: all teams a user belongs to
teamMemberSchema.index({ user_id: 1 });

module.exports = mongoose.model('TeamMember', teamMemberSchema);
