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

  async updateProfile(id, profileData) {
    return await User.findByIdAndUpdate(
      id,
      { $set: profileData },
      { new: true, runValidators: true }
    ).select('-password_hash');
  }

  async updatePassword(id, hashedPassword) {
    return await User.findByIdAndUpdate(
      id,
      { $set: { password_hash: hashedPassword } },
      { new: true }
    );
  }
}

module.exports = new UserService();
