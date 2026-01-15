const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true
  },
  password_hash: {
    type: String,
    required: true
  },
  google_tokens: {
    type: Object, // Stores access_token, refresh_token, etc.
    default: null
  }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

// Match the service interface expected by controller (if we want to keep it raw)
// Or better, methods to match what we had.
module.exports = mongoose.model('User', userSchema);
