const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

// Index for fast lookup by creator
teamSchema.index({ created_by: 1 });

module.exports = mongoose.model('Team', teamSchema);
