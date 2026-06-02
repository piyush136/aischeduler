const axios = require('axios');
const WhatsAppUser = require('../models/whatsappUser.model');
const User = require('../models/user.model');
const TelegramService = require('./telegram.service');

const GRAPH_API_VERSION = process.env.WHATSAPP_GRAPH_API_VERSION || 'v25.0';

function normalizePhoneNumber(value) {
  return String(value || '').replace(/\D/g, '');
}

function generateRandomCode(length = 6) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < length; i += 1) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function getGraphApiUrl(path) {
  return `https://graph.facebook.com/${GRAPH_API_VERSION}/${path.replace(/^\/+/, '')}`;
}

class WhatsAppService {
  static verifyWebhook(query) {
    const mode = query['hub.mode'];
    const token = query['hub.verify_token'];
    const challenge = query['hub.challenge'];

    if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
      return { verified: true, challenge };
    }

    return { verified: false };
  }

  static async generateLinkingCode(userId) {
    const code = generateRandomCode();

    await WhatsAppUser.findOneAndUpdate(
      { $or: [{ user_id: userId }, { phone_number: `pending:${userId}` }] },
      {
        $set: {
          user_id: userId,
          linking_code: code,
          created_at: new Date()
        },
        $setOnInsert: {
          phone_number: `pending:${userId}`,
          is_linked: false
        }
      },
      { upsert: true, new: true, runValidators: true }
    );

    return {
      success: true,
      linking_code: code,
      expires_in_minutes: 30,
      message: `Your WhatsApp linking code: ${code}. Send LINK ${code} to your WhatsApp Cloud API number.`
    };
  }

  static async getLinkStatus(userId) {
    const whatsappUser = await WhatsAppUser.findOne({ user_id: userId, is_linked: true })
      .select('phone_number profile_name linked_at');

    return {
      success: true,
      linked: Boolean(whatsappUser),
      whatsapp: whatsappUser ? {
        phone_number: whatsappUser.phone_number,
        profile_name: whatsappUser.profile_name,
        linked_at: whatsappUser.linked_at
      } : null
    };
  }

  static async unlinkByUserId(userId) {
    const whatsappUser = await WhatsAppUser.findOne({ user_id: userId, is_linked: true });

    await WhatsAppUser.deleteMany({
      user_id: userId,
      phone_number: `pending:${userId}`
    });

    await WhatsAppUser.updateMany(
      { user_id: userId },
      {
        $set: {
          user_id: null,
          is_linked: false,
          linked_at: null,
          linking_code: null
        }
      }
    );

    await User.findByIdAndUpdate(userId, { whatsapp_phone: null });

    return {
      success: true,
      linked: false,
      phone_number: whatsappUser?.phone_number || null,
      message: whatsappUser
        ? 'WhatsApp account unlinked successfully.'
        : 'WhatsApp account was not linked.'
    };
  }

  static async unlinkByPhoneNumber(phoneNumber) {
    const normalizedPhone = normalizePhoneNumber(phoneNumber);
    const whatsappUser = await WhatsAppUser.findOne({ phone_number: normalizedPhone, is_linked: true });

    if (!whatsappUser) {
      return {
        success: false,
        message: 'Your WhatsApp account is not linked.'
      };
    }

    await User.findByIdAndUpdate(whatsappUser.user_id, { whatsapp_phone: null });
    await WhatsAppUser.findByIdAndUpdate(whatsappUser._id, {
      user_id: null,
      is_linked: false,
      linked_at: null,
      linking_code: null
    });

    return {
      success: true,
      message: 'WhatsApp account unlinked successfully. You can link again from the web app anytime.'
    };
  }

  static async linkAccount(linkingCode, phoneNumber, profileName) {
    const normalizedCode = String(linkingCode || '').trim().toUpperCase();
    const normalizedPhone = normalizePhoneNumber(phoneNumber);
    const whatsappUser = await WhatsAppUser.findOne({ linking_code: normalizedCode });

    if (!whatsappUser || !whatsappUser.user_id) {
      return {
        success: false,
        message: 'Invalid or expired linking code. Please generate a new WhatsApp code from the web app.'
      };
    }

    await WhatsAppUser.deleteOne({
      phone_number: normalizedPhone,
      _id: { $ne: whatsappUser._id }
    });

    await WhatsAppUser.findByIdAndUpdate(whatsappUser._id, {
      phone_number: normalizedPhone,
      profile_name: profileName || null,
      is_linked: true,
      linked_at: new Date(),
      linking_code: null
    });

    await User.findByIdAndUpdate(whatsappUser.user_id, { whatsapp_phone: normalizedPhone });

    return {
      success: true,
      message: 'Account linked successfully! Send a natural language message like "meeting tomorrow 5pm" to create a task.'
    };
  }

  static async getUserByPhoneNumber(phoneNumber) {
    const normalizedPhone = normalizePhoneNumber(phoneNumber);
    const whatsappUser = await WhatsAppUser.findOne({ phone_number: normalizedPhone, is_linked: true })
      .populate('user_id');

    if (whatsappUser?.user_id) {
      return whatsappUser.user_id;
    }

    return User.findOne({ whatsapp_phone: normalizedPhone });
  }

  static extractIncomingTextMessages(payload) {
    const messages = [];

    for (const entry of payload?.entry || []) {
      for (const change of entry?.changes || []) {
        const value = change?.value || {};
        const contactsByWaId = new Map(
          (value.contacts || []).map(contact => [contact.wa_id, contact.profile?.name || null])
        );

        for (const message of value.messages || []) {
          if (message.type !== 'text' || !message.text?.body) continue;

          messages.push({
            messageId: message.id,
            from: normalizePhoneNumber(message.from),
            profileName: contactsByWaId.get(message.from) || null,
            text: String(message.text.body).trim(),
            timestamp: message.timestamp ? new Date(Number(message.timestamp) * 1000) : new Date()
          });
        }
      }
    }

    return messages;
  }

  static async createTaskFromMessage(phoneNumber, messageText) {
    const user = await this.getUserByPhoneNumber(phoneNumber);

    if (!user) {
      return {
        success: false,
        message: 'Your WhatsApp number is not linked yet. Open the web app, generate a WhatsApp linking code, then send LINK <code> here.'
      };
    }

    return TelegramService.createTaskFromMessage(user._id, messageText);
  }

  static async sendTextMessage(to, body) {
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

    if (!accessToken || !phoneNumberId) {
      throw new Error('WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID are required to send WhatsApp messages');
    }

    const response = await axios.post(
      getGraphApiUrl(`${phoneNumberId}/messages`),
      {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: normalizePhoneNumber(to),
        type: 'text',
        text: {
          preview_url: false,
          body
        }
      },
      {
        timeout: 10000,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data;
  }
}

module.exports = WhatsAppService;
