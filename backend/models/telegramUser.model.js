const mongoose = require('mongoose');

const telegramUserSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false,
    default: null
  },
  telegram_id: {
    type: String,
    required: true,
    unique: true
  },
  telegram_username: {
    type: String,
    default: null
  },
  linking_code: {
    type: String,
    default: null,
    sparse: true
  },
  is_linked: {
    type: Boolean,
    default: false
  },
  linked_at: {
    type: Date,
    default: null
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
}, { 
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// TTL index: auto-delete linking codes after 30 minutes (1800 seconds)
telegramUserSchema.index(
  { created_at: 1 },
  { 
    expireAfterSeconds: 1800,
    partialFilterExpression: { linking_code: { $exists: true, $ne: null } }
  }
);

// Indexes for lookups
// Note: telegram_id already has unique index from schema definition
telegramUserSchema.index({ user_id: 1 });
telegramUserSchema.index({ linking_code: 1 }, { sparse: true });
telegramUserSchema.index({ is_linked: 1 });

module.exports = mongoose.model('TelegramUser', telegramUserSchema);
