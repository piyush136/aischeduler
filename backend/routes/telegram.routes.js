const express = require('express');
const router = express.Router();
const TelegramController = require('../controllers/telegram.controller');
const authMiddleware = require('../middleware/auth.middleware');

/**
 * POST /telegram/link-code
 * Generate a linking code for the authenticated user
 * Requires: JWT auth token
 */
router.post('/link-code', authMiddleware, TelegramController.generateLinkingCode);

/**
 * GET /telegram/status
 * Get Telegram linking status for the authenticated user
 */
router.get('/status', authMiddleware, TelegramController.getLinkStatus);

/**
 * DELETE /telegram/link
 * Unlink Telegram from the authenticated user
 */
router.delete('/link', authMiddleware, TelegramController.unlinkAccount);

/**
 * POST /telegram/webhook
 * Receive Telegram webhook updates
 * Called by Telegram servers
 */
router.post('/webhook', TelegramController.handleWebhook);

/**
 * GET /telegram/tasks
 * Get user's recent tasks
 * Requires: JWT auth token
 */
router.get('/tasks', authMiddleware, TelegramController.getUserTasks);

module.exports = router;
