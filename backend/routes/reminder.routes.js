const express = require('express');
const router = express.Router();
const reminderController = require('../controllers/reminder.controller');
const authMiddleware = require('../middleware/auth.middleware');

router.use(authMiddleware);

router.get('/', reminderController.listReminders);
router.post('/', reminderController.upsertReminder);

module.exports = router;
