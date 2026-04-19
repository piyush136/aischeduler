const express = require('express');
const router = express.Router();
const teamController = require('../controllers/team.controller');
const authMiddleware = require('../middleware/auth.middleware');

// All team routes require authentication
router.use(authMiddleware);

// POST /teams — Create a new team
router.post('/', teamController.createTeam);

// PATCH /teams/:teamId — Update team name (admin only)
router.patch('/:teamId', teamController.updateTeam);

// DELETE /teams/:teamId — Delete a team (admin only)
router.delete('/:teamId', teamController.deleteTeam);

// GET /teams — Get all teams for the authenticated user
router.get('/', teamController.getUserTeams);

// POST /teams/:teamId/members — Add a member to a team
router.post('/:teamId/members', teamController.addMember);

// GET /teams/:teamId/members — Get all members of a team
router.get('/:teamId/members', teamController.getTeamMembers);

// GET /teams/:teamId/tasks — Get all tasks for a team
router.get('/:teamId/tasks', teamController.getTeamTasks);

// GET /teams/:teamId/messages
router.get('/:teamId/messages', teamController.getTeamMessages);

// POST /teams/:teamId/messages
router.post('/:teamId/messages', teamController.sendTeamMessage);

// POST /teams/:teamId/accept-invite
router.post('/:teamId/accept-invite', teamController.acceptInvite);

// POST /teams/:teamId/reject-invite
router.post('/:teamId/reject-invite', teamController.rejectInvite);

// DELETE /teams/:teamId/members/:memberId — Remove a member (admin only)
router.delete('/:teamId/members/:memberId', teamController.removeMember);

// PATCH /teams/:teamId/members/:memberId/permissions — Update member permissions (admin only)
router.patch('/:teamId/members/:memberId/permissions', teamController.updateMemberPermissions);

module.exports = router;
