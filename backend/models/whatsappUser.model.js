const mongoose = require('mongoose');

const whatsappUserSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false,
    default: null
  },
  phone_number: {
    type: String,
    default: null
  },
  profile_name: {
    type: String,
    default: null
  },
  linking_code: {
    type: String,
    default: null
  },
  is_linked: {
    type: Boolean,
    default: false
  },
  linked_at: {
    type: Date,
    default: null
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

whatsappUserSchema.index(
  { created_at: 1 },
  {
    expireAfterSeconds: 1800,
    partialFilterExpression: { linking_code: { $exists: true, $ne: null } }
  }
);

whatsappUserSchema.index({ phone_number: 1 }, { unique: true, sparse: true });
whatsappUserSchema.index({ user_id: 1 });
whatsappUserSchema.index({ linking_code: 1 }, { sparse: true });
whatsappUserSchema.index({ is_linked: 1 });

module.exports = mongoose.model('WhatsAppUser', whatsappUserSchema);
