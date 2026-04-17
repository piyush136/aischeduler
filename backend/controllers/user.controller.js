const userService = require('../services/user.service');
const User = require('../models/user.model');
const bcrypt = require('bcryptjs');

exports.getProfile = async (req, res) => {
  try {
    console.log('[getProfile] req.user:', req.user);
    if (!req.user || !req.user.id) {
       console.error('[getProfile] Missing id in req.user');
       return res.status(401).json({ error: 'Invalid token payload, missing user ID' });
    }

    const user = await userService.findById(req.user.id);
    if (!user) {
      console.error(`[getProfile] User not found for ID: ${req.user.id}`);
      return res.status(404).json({ error: 'User not found in database' });
    }
    
    res.json(user);
  } catch (err) {
    console.error('[getProfile] Error fetching profile:', err);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { name, phone, profile_picture } = req.body;
    const profileData = {};
    if (name) profileData.name = name;
    if (phone !== undefined) profileData.phone = phone; // allow clearing
    if (profile_picture !== undefined) profileData.profile_picture = profile_picture;

    const updatedUser = await userService.updateProfile(req.user.id, profileData);
    res.json(updatedUser);
  } catch (err) {
    console.error('Error updating profile:', err);
    res.status(500).json({ error: 'Failed to update user profile' });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Both current and new passwords are required' });
    }

    // Need to get user WITH password hash to verify
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!user.password_hash) {
       return res.status(400).json({ error: 'User logs in via Google and cannot change password' });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ error: 'Incorrect current password' });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(newPassword, salt);

    await userService.updatePassword(req.user.id, password_hash);

    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error('Error changing password:', err);
    res.status(500).json({ error: 'Failed to change password' });
  }
};
