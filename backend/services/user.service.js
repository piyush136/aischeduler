const User = require('../models/user.model');

class UserService {
  async create(userData) {
    const user = new User(userData);
    return await user.save();
  }

  async findByEmail(email) {
    return await User.findOne({ email });
  }

  async findById(id) {
    return await User.findById(id).select('-password_hash');
  }
}

module.exports = new UserService();
