const teamService = require('../services/team.service');

exports.createTeam = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Team name is required' });
    }

    const team = await teamService.createTeam(name.trim(), userId);
    console.log('[TeamController] Team created:', { id: team._id, name: team.name, by: userId });
    res.status(201).json(team);
  } catch (err) {
    console.error('[TeamController] Create team error:', err);
    res.status(500).json({ error: 'Failed to create team', details: err.message });
  }
};

exports.updateTeam = async (req, res) => {
  try {
    const userId = req.user.id;
    const { teamId } = req.params;
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Team name is required' });
    }

    const team = await teamService.updateTeam(teamId, name.trim(), userId);
    
    if (team.error) {
       return res.status(team.status).json({ error: team.error });
    }

    res.json(team);
  } catch (err) {
    console.error('[TeamController] Update team error:', err);
    res.status(500).json({ error: 'Failed to update team' });
  }
};

exports.deleteTeam = async (req, res) => {
  try {
    const userId = req.user.id;
    const { teamId } = req.params;

    const result = await teamService.deleteTeam(teamId, userId);
    
    if (result.error) {
       return res.status(result.status).json({ error: result.error });
    }

    res.json({ message: 'Team deleted successfully' });
  } catch (err) {
    console.error('[TeamController] Delete team error:', err);
    res.status(500).json({ error: 'Failed to delete team' });
  }
};

exports.getUserTeams = async (req, res) => {
  try {
    const userId = req.user.id;
    const teams = await teamService.getUserTeams(userId);
    res.json(teams);
  } catch (err) {
    console.error('[TeamController] Get teams error:', err);
    res.status(500).json({ error: 'Failed to fetch teams' });
  }
};

exports.addMember = async (req, res) => {
  try {
    const userId = req.user.id;
    const { teamId } = req.params;
    const { email } = req.body;

    if (!email || !email.trim()) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const result = await teamService.addMember(teamId, email, userId);

    if (result.error) {
      return res.status(result.status).json({ error: result.error });
    }

    console.log('[TeamController] Member added:', result.member);
    res.status(201).json(result.member);
  } catch (err) {
    console.error('[TeamController] Add member error:', err);
    res.status(500).json({ error: 'Failed to add member', details: err.message });
  }
};

exports.getTeamMembers = async (req, res) => {
  try {
    const userId = req.user.id;
    const { teamId } = req.params;
    const members = await teamService.getTeamMembers(teamId, userId);
    if (members.error) {
      return res.status(members.status).json({ error: members.error });
    }
    res.json(members);
  } catch (err) {
    console.error('[TeamController] Get members error:', err);
    res.status(500).json({ error: 'Failed to fetch team members' });
  }
};

exports.getTeamTasks = async (req, res) => {
  try {
    const { teamId } = req.params;
    const userId = req.user.id;
    const tasks = await teamService.getTeamTasks(teamId, userId);
    if (tasks.error) {
      return res.status(tasks.status).json({ error: tasks.error });
    }
    res.json(tasks);
  } catch (err) {
    console.error('[TeamController] Get team tasks error:', err);
    res.status(500).json({ error: 'Failed to fetch team tasks' });
  }
};

exports.acceptInvite = async (req, res) => {
  try {
    const userId = req.user.id;
    const { teamId } = req.params;
    const result = await teamService.acceptInvite(teamId, userId);
    if (result.error) {
      return res.status(result.status).json({ error: result.error });
    }
    res.json({ message: 'Invite accepted' });
  } catch (err) {
    console.error('[TeamController] Accept invite error:', err);
    res.status(500).json({ error: 'Failed to accept invite' });
  }
};

exports.rejectInvite = async (req, res) => {
  try {
    const userId = req.user.id;
    const { teamId } = req.params;
    const result = await teamService.rejectInvite(teamId, userId);
    if (result.error) {
      return res.status(result.status).json({ error: result.error });
    }
    res.json({ message: 'Invite rejected' });
  } catch (err) {
    console.error('[TeamController] Reject invite error:', err);
    res.status(500).json({ error: 'Failed to reject invite' });
  }
};

exports.removeMember = async (req, res) => {
  try {
    const userId = req.user.id;
    const { teamId, memberId } = req.params;
    const result = await teamService.removeMember(teamId, memberId, userId);

    if (result.error) {
      return res.status(result.status).json({ error: result.error });
    }

    console.log('[TeamController] Member removed from team:', { teamId, memberId, by: userId });
    res.json({ message: 'Member removed successfully' });
  } catch (err) {
    console.error('[TeamController] Remove member error:', err);
    res.status(500).json({ error: 'Failed to remove member', details: err.message });
  }
};

exports.updateMemberPermissions = async (req, res) => {
  try {
    const userId = req.user.id;
    const { teamId, memberId } = req.params;
    const { can_add_task, can_edit_task } = req.body;

    const result = await teamService.updateMemberPermissions(
      teamId, memberId, { can_add_task, can_edit_task }, userId
    );

    if (result.error) {
      return res.status(result.status).json({ error: result.error });
    }

    console.log('[TeamController] Permissions updated:', result.member);
    res.json(result.member);
  } catch (err) {
    console.error('[TeamController] Update permissions error:', err);
    res.status(500).json({ error: 'Failed to update permissions', details: err.message });
  }
};
