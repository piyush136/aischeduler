const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notification.controller');
const authMiddleware = require('../middleware/auth.middleware');

// All notification routes require authentication
router.use(authMiddleware);

// GET /notifications — Get all notifications for the authenticated user
router.get('/', notificationController.getNotifications);

// GET /notifications/unread-count — Get unread notification count
router.get('/unread-count', notificationController.getUnreadCount);

// PATCH /notifications/:id/read — Mark a notification as read
router.patch('/:id/read', notificationController.markAsRead);

module.exports = router;
