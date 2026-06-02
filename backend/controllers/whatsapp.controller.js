const WhatsAppService = require('../services/whatsapp.service');

class WhatsAppController {
  static async generateLinkingCode(req, res) {
    try {
      const userId = req.user.id;
      const result = await WhatsAppService.generateLinkingCode(userId);
      return res.status(200).json(result);
    } catch (error) {
      console.error('[WhatsAppController] Generate linking code error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to generate WhatsApp linking code',
        error: error.message
      });
    }
  }

  static async getLinkStatus(req, res) {
    try {
      const result = await WhatsAppService.getLinkStatus(req.user.id);
      return res.status(200).json(result);
    } catch (error) {
      console.error('[WhatsAppController] Link status error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch WhatsApp link status',
        error: error.message
      });
    }
  }

  static async unlinkAccount(req, res) {
    try {
      const result = await WhatsAppService.unlinkByUserId(req.user.id);
      return res.status(200).json(result);
    } catch (error) {
      console.error('[WhatsAppController] Unlink error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to unlink WhatsApp account',
        error: error.message
      });
    }
  }

  static verifyWebhook(req, res) {
    const result = WhatsAppService.verifyWebhook(req.query);

    if (!result.verified) {
      return res.sendStatus(403);
    }

    return res.status(200).send(result.challenge);
  }

  static async handleWebhook(req, res) {
    try {
      res.status(200).json({ ok: true });

      WhatsAppController._processWebhook(req.body).catch(error => {
        console.error('[WhatsAppController] Webhook processing error:', error);
      });
    } catch (error) {
      console.error('[WhatsAppController] Webhook error:', error);
      if (!res.headersSent) {
        return res.status(200).json({ ok: true });
      }
    }
  }

  static async _processWebhook(payload) {
    const messages = WhatsAppService.extractIncomingTextMessages(payload);

    for (const message of messages) {
      console.log('[WhatsApp] Incoming text message:', {
        from: message.from,
        profileName: message.profileName,
        messageId: message.messageId,
        text: message.text
      });

      const reply = await WhatsAppController._handleIncomingText(message);
      await WhatsAppService.sendTextMessage(message.from, reply);
    }
  }

  static async _handleIncomingText(message) {
    const text = message.text.trim();
    const linkMatch = text.match(/^\/?link\s+([A-Za-z0-9]+)$/i);

    if (linkMatch) {
      const result = await WhatsAppService.linkAccount(
        linkMatch[1],
        message.from,
        message.profileName
      );
      return result.message;
    }

    if (/^\/?unlink$/i.test(text)) {
      const result = await WhatsAppService.unlinkByPhoneNumber(message.from);
      return result.message;
    }

    if (/^\/?help$/i.test(text)) {
      return WhatsAppController._getHelpMessage();
    }

    const result = await WhatsAppService.createTaskFromMessage(message.from, text);
    return result.message || (result.success ? 'Task created successfully.' : 'Failed to create task.');
  }

  static _getHelpMessage() {
    return [
      'AI Task Manager WhatsApp commands:',
      'LINK <code> - Link this WhatsApp number to your account',
      'UNLINK - Disconnect this WhatsApp number',
      'HELP - Show this message',
      '',
      'After linking, send tasks naturally, for example: "meeting tomorrow 5pm".'
    ].join('\n');
  }
}

module.exports = WhatsAppController;
