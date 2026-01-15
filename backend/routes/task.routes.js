const express = require('express');
const router = express.Router();
const taskController = require('../controllers/task.controller');
const authMiddleware = require('../middleware/auth.middleware');

router.use(authMiddleware); 

router.post('/', taskController.createTask);
router.get('/', taskController.getAllTasks);
router.get('/today', taskController.getTodayTasks);
router.patch('/:id', taskController.updateTask);
router.delete('/:id', taskController.deleteTask);

module.exports = router;
