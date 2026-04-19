const Team = require('../models/team.model');
const TeamMember = require('../models/teamMember.model');
const User = require('../models/user.model');
const Task = require('../models/task.model');
const TeamMessage = require('../models/teamMessage.model');
const notificationService = require('./notification.service');

class TeamService {
  /**
   * Create a new team and add the creator as admin
   */
  async createTeam(name, userId) {
    const team = new Team({ name, created_by: userId });
    await team.save();

    // Add creator as admin member
    const member = new TeamMember({
      team_id: team._id,
      user_id: userId,
      role: 'admin',
      status: 'active',
      joined_at: new Date()
    });
    await member.save();

    return team;
  }

  /**
   * Update team name (admin only)
   */
  async updateTeam(teamId, name, requestingUserId) {
    const requester = await TeamMember.findOne({ team_id: teamId, user_id: requestingUserId });
    if (!requester || requester.role !== 'admin') {
      return { error: 'Only admins can update team settings', status: 403 };
    }

    const team = await Team.findById(teamId);
    if (!team) return { error: 'Team not found', status: 404 };

    team.name = name;
    await team.save();

    return team;
  }

  /**
   * Delete a team (admin only)
   * Also cleans up team members and tasks associated with the team.
   */
  async deleteTeam(teamId, requestingUserId) {
    const requester = await TeamMember.findOne({ team_id: teamId, user_id: requestingUserId });
    if (!requester || requester.role !== 'admin') {
      return { error: 'Only admins can delete teams', status: 403 };
    }

    const team = await Team.findById(teamId);
    if (!team) return { error: 'Team not found', status: 404 };

    // Find all team members to notify them (except the admin deleting it)
    const members = await TeamMember.find({ team_id: teamId });
    const memberIdsToNotify = members
      .filter(m => m.user_id.toString() !== requestingUserId.toString())
      .map(m => m.user_id);

    // Create notifications for members
    if (memberIdsToNotify.length > 0) {
      try {
        const notifications = memberIdsToNotify.map(uid => ({
          user_id: uid,
          type: 'info',
          message: `Team "${team.name}" has been deleted.`
        }));
        // Use Notification model directly since notificationService might not have a bulk create
        const Notification = require('../models/notification.model');
        await Notification.insertMany(notifications);
      } catch (err) {
        console.error('[TeamService] Failed to create team deletion notifications', err);
      }
    }

    // Delete tasks, members, messages, and team
    await Task.deleteMany({ team_id: teamId });
    await TeamMember.deleteMany({ team_id: teamId });
    await TeamMessage.deleteMany({ team_id: teamId });
    await Team.deleteOne({ _id: teamId });

    return { success: true };
  }

  /**
   * Get all teams where the user is a member
   */
  async getUserTeams(userId) {
    const memberships = await TeamMember.find({ user_id: userId, status: { $ne: 'pending' } })
      .populate({
        path: 'team_id',
        model: 'Team'
      })
      .lean();

    // Return team objects with the user's role
    return memberships
      .filter(m => m.team_id) // guard against deleted teams
      .map(m => ({
        team_id: m.team_id._id,
        name: m.team_id.name,
        created_by: m.team_id.created_by,
        ...m.team_id,
        role: m.role,
        status: m.status,
        joined_at: m.joined_at
      }));
  }

  /**
   * Accept an invite to a team
   */
  async acceptInvite(teamId, userId) {
    const member = await TeamMember.findOne({ team_id: teamId, user_id: userId, status: 'pending' });
    if (!member) {
      return { error: 'No pending invite found', status: 404 };
    }
    member.status = 'active';
    await member.save();

    return { success: true };
  }

  /**
   * Reject an invite to a team
   */
  async rejectInvite(teamId, userId) {
    const result = await TeamMember.deleteOne({ team_id: teamId, user_id: userId, status: 'pending' });
    if (result.deletedCount === 0) {
      return { error: 'No pending invite found', status: 404 };
    }
    return { success: true };
  }

  /**
   * Add a member to a team by email
   */
  async addMember(teamId, email, requestingUserId) {
    // Verify the requesting user is an active admin
    const requesterMembership = await TeamMember.findOne({
      team_id: teamId,
      user_id: requestingUserId,
      status: 'active'
    });
    if (!requesterMembership || requesterMembership.role !== 'admin') {
      return { error: 'Only team admins can invite members', status: 403 };
    }

    // Find user by email
    const userToAdd = await User.findOne({ email: email.toLowerCase().trim() });
    if (!userToAdd) {
      return { error: 'No user found with that email', status: 404 };
    }

    // Check if already a member
    const existing = await TeamMember.findOne({
      team_id: teamId,
      user_id: userToAdd._id
    });
    if (existing) {
      return { error: 'User is already a member of this team', status: 409 };
    }

    const member = new TeamMember({
      team_id: teamId,
      user_id: userToAdd._id,
      role: 'member',
      status: 'pending',
      joined_at: new Date()
    });
    await member.save();

    // Create notification to invited user
    const team = await Team.findById(teamId);
    try {
      await notificationService.create({
        user_id: userToAdd._id,
        type: 'team_invite',
        team_id: teamId,
        message: `You have been invited to join team "${team?.name || 'Unknown'}"`
      });
    } catch(err) {
      console.error('[TeamService] Failed to create invite notification', err);
    }

    return {
      member: {
        _id: member._id,
        user_id: userToAdd._id,
        name: userToAdd.name,
        email: userToAdd.email,
        role: member.role,
        status: member.status,
        joined_at: member.joined_at
      }
    };
  }

  /**
   * Get all members of a team with user details
   */
  async getTeamMembers(teamId, requestingUserId) {
    const requesterMembership = await TeamMember.findOne({
      team_id: teamId,
      user_id: requestingUserId,
      status: { $ne: 'pending' }
    });
    if (!requesterMembership) {
      return { error: 'You are not a member of this team', status: 403 };
    }

    const members = await TeamMember.find({ team_id: teamId })
      .populate({
        path: 'user_id',
        model: 'User',
        select: 'name email profile_picture'
      })
      .lean();

    return members.map(m => ({
      _id: m._id,
      user_id: m.user_id?._id,
      name: m.user_id?.name,
      email: m.user_id?.email,
      profile_picture: m.user_id?.profile_picture,
      role: m.role,
      status: m.status,
      can_add_task: m.can_add_task !== false, // default true for legacy docs
      can_edit_task: m.can_edit_task !== false,
      joined_at: m.joined_at
    }));
  }

  /**
   * Remove a member from a team (admin only)
   */
  async removeMember(teamId, memberId, requestingUserId) {
    // Verify the requesting user is an admin
    const requester = await TeamMember.findOne({
      team_id: teamId,
      user_id: requestingUserId
    });

    if (!requester || requester.role !== 'admin') {
      return { error: 'Only admins can remove members', status: 403 };
    }

    // Find the member to remove
    const memberToRemove = await TeamMember.findOne({
      team_id: teamId,
      _id: memberId
    });

    if (!memberToRemove) {
      return { error: 'Member not found', status: 404 };
    }

    // Prevent admin from removing themselves
    if (memberToRemove.user_id.toString() === requestingUserId.toString()) {
      return { error: 'You cannot remove yourself from the team', status: 400 };
    }

    await TeamMember.deleteOne({ _id: memberId });

    // Send notification to the removed user
    const team = await Team.findById(teamId);
    try {
      await notificationService.create({
        user_id: memberToRemove.user_id,
        type: 'info',
        message: `You have been removed from team "${team?.name || 'Unknown'}"`
      });
    } catch (err) {
      console.error('[TeamService] Failed to create removal notification', err);
    }

    return { success: true };
  }

  /**
   * Update a member's permissions (admin only)
   */
  async updateMemberPermissions(teamId, memberId, permissions, requestingUserId) {
    // Verify the requesting user is an admin
    const requester = await TeamMember.findOne({
      team_id: teamId,
      user_id: requestingUserId
    });

    if (!requester || requester.role !== 'admin') {
      return { error: 'Only admins can update permissions', status: 403 };
    }

    // Find the member
    const member = await TeamMember.findOne({
      team_id: teamId,
      _id: memberId
    });

    if (!member) {
      return { error: 'Member not found', status: 404 };
    }

    // Don't allow changing admin permissions
    if (member.role === 'admin') {
      return { error: 'Cannot change admin permissions', status: 400 };
    }

    // Update permissions
    if (typeof permissions.can_add_task === 'boolean') {
      member.can_add_task = permissions.can_add_task;
    }
    if (typeof permissions.can_edit_task === 'boolean') {
      member.can_edit_task = permissions.can_edit_task;
    }

    await member.save();

    return {
      member: {
        _id: member._id,
        can_add_task: member.can_add_task,
        can_edit_task: member.can_edit_task
      }
    };
  }

  /**
   * Get all tasks for a team visible to user
   */
  async getTeamTasks(teamId, userId) {
    const requesterMembership = await TeamMember.findOne({
      team_id: teamId,
      user_id: userId,
      status: { $ne: 'pending' }
    });
    if (!requesterMembership) {
      return { error: 'You are not a member of this team', status: 403 };
    }

    return await Task.find({
      team_id: teamId,
      $or: [
        { assigned_to: { $exists: true, $size: 0 } }, // assigned to nobody explicitly => all
        { assigned_to: { $exists: false } }, // legacy
        { assigned_to: null }, // legacy
        { assigned_to: userId }, // assigned to user
        { created_by: userId }   // created by user
      ]
    })
      .populate('assigned_to', 'name email')
      .populate('created_by', 'name email')
      .populate('comments.user_id', 'name email profile_picture')
      .sort({ due_at: 1 });
  }

  /**
   * Get recent messages for active team members
   */
  async getTeamMessages(teamId, userId, peerUserId, limit = 500, conversationType = 'direct') {
    const requesterMembership = await TeamMember.findOne({
      team_id: teamId,
      user_id: userId,
      status: 'active'
    });
    if (!requesterMembership) {
      return { error: 'You are not an active member of this team', status: 403 };
    }

    const isTeamConversation = conversationType === 'team';

    if (!isTeamConversation && !peerUserId) {
      return { error: 'Message recipient is required', status: 400 };
    }

    if (!isTeamConversation) {
      const peerMembership = await TeamMember.findOne({
        team_id: teamId,
        user_id: peerUserId,
        status: 'active'
      });
      if (!peerMembership) {
        return { error: 'Recipient is not an active member of this team', status: 404 };
      }
    }

    const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 500, 1), 1000);
    const query = isTeamConversation
      ? { team_id: teamId, conversation_type: 'team' }
      : {
          team_id: teamId,
          conversation_type: { $ne: 'team' },
          $or: [
            { sender_id: userId, recipient_id: peerUserId },
            { sender_id: peerUserId, recipient_id: userId }
          ]
        };

    const messages = await TeamMessage.find(query)
      .populate('sender_id', 'name email profile_picture')
      .populate('recipient_id', 'name email profile_picture')
      .sort({ created_at: -1 })
      .limit(safeLimit)
      .lean();

    return messages.reverse().map(message => ({
      _id: message._id,
      team_id: message.team_id,
      conversation_type: message.conversation_type || 'direct',
      body: message.body,
      created_at: message.created_at,
      updated_at: message.updated_at,
      sender: {
        _id: message.sender_id?._id,
        name: message.sender_id?.name,
        email: message.sender_id?.email,
        profile_picture: message.sender_id?.profile_picture
      },
      recipient: {
        _id: message.recipient_id?._id,
        name: message.recipient_id?.name,
        email: message.recipient_id?.email,
        profile_picture: message.recipient_id?.profile_picture
      }
    }));
  }

  /**
   * Send a team message as an active member
   */
  async sendTeamMessage(teamId, userId, recipientId, body, conversationType = 'direct') {
    const requesterMembership = await TeamMember.findOne({
      team_id: teamId,
      user_id: userId,
      status: 'active'
    });
    if (!requesterMembership) {
      return { error: 'You are not an active member of this team', status: 403 };
    }

    const isTeamConversation = conversationType === 'team';

    if (!isTeamConversation && !recipientId) {
      return { error: 'Message recipient is required', status: 400 };
    }
    if (!isTeamConversation && recipientId.toString() === userId.toString()) {
      return { error: 'Select another team member to message', status: 400 };
    }

    if (!isTeamConversation) {
      const recipientMembership = await TeamMember.findOne({
        team_id: teamId,
        user_id: recipientId,
        status: 'active'
      });
      if (!recipientMembership) {
        return { error: 'Recipient is not an active member of this team', status: 404 };
      }
    }

    const trimmedBody = String(body || '').trim();
    if (!trimmedBody) {
      return { error: 'Message cannot be empty', status: 400 };
    }
    if (trimmedBody.length > 2000) {
      return { error: 'Message is too long', status: 400 };
    }

    const message = await TeamMessage.create({
      team_id: teamId,
      sender_id: userId,
      recipient_id: isTeamConversation ? null : recipientId,
      conversation_type: isTeamConversation ? 'team' : 'direct',
      body: trimmedBody
    });

    const populated = await TeamMessage.findById(message._id)
      .populate('sender_id', 'name email profile_picture')
      .populate('recipient_id', 'name email profile_picture')
      .lean();

    try {
      const senderName = populated.sender_id?.name || populated.sender_id?.email || 'A team member';
      const preview = trimmedBody.length > 80 ? `${trimmedBody.slice(0, 77)}...` : trimmedBody;
      if (isTeamConversation) {
        const teamMembers = await TeamMember.find({ team_id: teamId, status: 'active' }).select('user_id').lean();
        await Promise.all(teamMembers
          .map(member => member.user_id)
          .filter(memberId => String(memberId) !== String(userId))
          .map(memberId => notificationService.create({
            user_id: memberId,
            type: 'team_message',
            team_id: teamId,
            actor_id: userId,
            conversation_type: 'team',
            message: `${senderName} sent a team message: "${preview}"`
          })));
      } else {
        await notificationService.create({
          user_id: recipientId,
          type: 'team_message',
          team_id: teamId,
          actor_id: userId,
          conversation_type: 'direct',
          message: `${senderName} sent you a message: "${preview}"`
        });
      }
    } catch (err) {
      console.error('[TeamService] Failed to create message notification', err);
    }

    return {
      _id: populated._id,
      team_id: populated.team_id,
      conversation_type: populated.conversation_type || 'direct',
      body: populated.body,
      created_at: populated.created_at,
      updated_at: populated.updated_at,
      sender: {
        _id: populated.sender_id?._id,
        name: populated.sender_id?.name,
        email: populated.sender_id?.email,
        profile_picture: populated.sender_id?.profile_picture
      },
      recipient: {
        _id: populated.recipient_id?._id,
        name: populated.recipient_id?.name,
        email: populated.recipient_id?.email,
        profile_picture: populated.recipient_id?.profile_picture
      }
    };
  }
}

module.exports = new TeamService();
