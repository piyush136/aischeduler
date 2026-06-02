const express = require('express');
const WhatsAppController = require('../controllers/whatsapp.controller');
const authMiddleware = require('../middleware/auth.middleware');

const router = express.Router();

router.post('/link-code', authMiddleware, WhatsAppController.generateLinkingCode);
router.get('/status', authMiddleware, WhatsAppController.getLinkStatus);
router.delete('/link', authMiddleware, WhatsAppController.unlinkAccount);

router.get('/webhook', WhatsAppController.verifyWebhook);
router.post('/webhook', WhatsAppController.handleWebhook);

module.exports = router;
