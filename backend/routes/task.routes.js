const express = require('express');
const router = express.Router();
const taskController = require('../controllers/task.controller');
const authMiddleware = require('../middleware/auth.middleware');

router.get('/debug-times', async (req, res) => {
  const Task = require('../models/task.model');
  const tasks = await Task.find({}).sort({ created_at: -1 }).limit(5);
  res.json({
      serverNow: new Date().toISOString(),
      tasks: tasks.map(t => ({ 
          title: t.title, 
          due_at: t.due_at, 
          raw_iso: t.due_at ? new Date(t.due_at).toISOString() : null,
          status: t.status, 
          sent: t.email_reminder_sent 
      }))
  });
});

router.use(authMiddleware); 

router.post('/', taskController.createTask);
router.post('/bulk', taskController.createBulkTasks);
router.get('/', taskController.getAllTasks);
router.get('/today', taskController.getTodayTasks);
router.patch('/:id', taskController.updateTask);
router.patch('/:id/postpone', taskController.postponeTask);
router.delete('/:id', taskController.deleteTask);
router.post('/:id/copy-personal', taskController.copyToPersonal);
router.post('/:id/copy-team', taskController.copyToTeam);
router.get('/check-conflict', taskController.checkConflict);
router.get('/free-slots', taskController.getFreeSlots);

// Subtask routes
router.post('/:taskId/subtasks', taskController.addSubtask);
router.patch('/:taskId/subtasks/:subtaskId', taskController.updateSubtask);
router.delete('/:taskId/subtasks/:subtaskId', taskController.deleteSubtask);

module.exports = router;
