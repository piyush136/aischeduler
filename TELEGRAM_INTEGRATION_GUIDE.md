# 🤖 Telegram Bot Integration - Complete Guide

## Overview

This Telegram bot integration allows users to create AI-powered tasks directly through Telegram using natural language. Users can:

- **Connect** their account via a secure linking code
- **Create tasks** by sending natural language messages (e.g., "meeting tomorrow 5pm")
- **View tasks** using the `/tasks` command
- **Manage schedule** right from Telegram

---

## 📋 Setup Checklist

### Backend Setup ✅
- [x] TelegramUser model created (TTL on linking codes)
- [x] User model updated with telegram_id field
- [x] Telegraf dependency installed
- [x] telegram.service.js created (core logic)
- [x] telegram.controller.js created (API handlers)
- [x] telegram.routes.js created (endpoints)
- [x] telegram.js config created (Telegraf initialization)
- [x] app.js updated (routes mounted)
- [x] Webhook endpoint working ✅

### Frontend Setup ✅
- [x] TelegramConnect component created
- [x] UserProfile updated with Integrations tab
- [x] Linking code generation UI implemented
- [x] Connection instructions displayed

### Environment Variables ✅
```env
TELEGRAM_BOT_TOKEN=8781745302:AAFbXFE8c6Tt3IojwM8QBY_pcRIlu6HSMvg
TELEGRAM_WEBHOOK_URL=https://api.aitaskmanger.site/telegram/webhook
TELEGRAM_WEBHOOK_SECRET=itmywayofdoingiamsidsidsid
```

---

## 🚀 How to Use

### For End Users

#### 1. **Generate Linking Code** (in web app)
```
Profile → Integrations → "Generate Linking Code"
```

#### 2. **Connect in Telegram**
```
1. Search for @ai_task_manager_bot in Telegram
2. Send: /link ABC123 (use your linking code)
3. Bot confirms: "✅ Account linked successfully!"
```

#### 3. **Create Tasks from Telegram**
```
Send any natural language message:
- "meeting tomorrow 5pm"
- "project deadline next Friday"
- "lunch with John Monday 12pm"
- "workout every morning"

Bot responds: "✅ Task created: {title} — Due: {date}"
```

#### 4. **View Your Tasks**
```
Send: /tasks
Bot shows your next 5 tasks with dates
```

#### 5. **Get Help**
```
Send: /help
Bot displays all available commands
```

---

## 🔌 API Endpoints

### **POST** `/telegram/link-code`
Generate a unique linking code for the authenticated user.

**Headers:**
```
Authorization: Bearer {JWT_TOKEN}
```

**Response:**
```json
{
  "success": true,
  "linking_code": "ABC123",
  "expires_in_minutes": 30,
  "message": "Your linking code: ABC123..."
}
```

---

### **POST** `/telegram/webhook`
Receive Telegram updates (called by Telegram servers).

**Body:**
```json
{
  "update_id": 123456789,
  "message": {
    "message_id": 1,
    "from": {
      "id": "987654321",
      "username": "testuser"
    },
    "text": "meeting tomorrow 5pm"
  }
}
```

**Response:**
```json
{
  "ok": true
}
```

---

### **GET** `/telegram/tasks`
Get user's recent tasks (requires authentication).

**Headers:**
```
Authorization: Bearer {JWT_TOKEN}
```

**Query Parameters:**
```
?limit=5  (default: 5)
```

**Response:**
```json
{
  "success": true,
  "message": "📋 Your next 5 task(s):\n\n1. ⭕ Meeting\n   📅 5/22/2026 at 5:00 PM\n...",
  "tasks": [
    {
      "_id": "...",
      "title": "Meeting",
      "due_at": "2026-05-22T17:00:00Z",
      "status": "pending",
      "priority": 3,
      "has_time": true
    }
  ]
}
```

---

## 🔐 Security Features

### **Linking Code TTL (30 minutes)**
- Codes auto-expire via MongoDB TTL index
- New code required if expired
- Prevents unauthorized account access

### **Account Validation**
- Code must be generated from authenticated web app session
- User account required to generate code
- Code deleted after successful link

### **Telegram ID Verification**
- Unique telegram_id enforced at database level
- Prevents duplicate account links
- User can only link one Telegram account per user profile

### **Webhook Signature Validation** (Optional)
- Set `TELEGRAM_WEBHOOK_SECRET` in `.env`
- Telegram includes `X-Telegram-Bot-Api-Secret-Token` header
- Can be validated for additional security

---

## 🧪 Testing

### **Run Integration Tests**
```bash
cd backend
node test-telegram-integration.js

# With JWT token (for authenticated endpoints):
node test-telegram-integration.js "YOUR_JWT_TOKEN"
```

**Test Coverage:**
- ✅ Generate linking code (requires auth)
- ✅ Webhook health check (receives Telegram data)
- ✅ Get user tasks (requires auth)
- ✅ Backend health check

---

## 🛠️ Local Development Setup

### **Option 1: Webhook Mode (Production-ready)**

1. **Install ngrok** (for local HTTPS tunnel):
   ```bash
   # Download from https://ngrok.com/
   # Or: choco install ngrok (Windows)
   # Or: brew install ngrok (macOS)
   ```

2. **Start ngrok tunnel**:
   ```bash
   ngrok http 5000
   ```

3. **Update `.env`**:
   ```env
   TELEGRAM_WEBHOOK_URL=https://abc123.ngrok.io/telegram/webhook
   ```

4. **Start backend**:
   ```bash
   cd backend
   npm run dev
   ```

5. **Test with Telegram bot**:
   - Send message to bot
   - Check backend logs for webhook events

### **Option 2: Polling Mode (Development only)**

1. **Remove `TELEGRAM_WEBHOOK_URL`** from `.env` (or set to empty)
2. **Start backend**:
   ```bash
   cd backend
   npm run dev
   ```
3. **Bot will poll Telegram** for updates (slower, higher latency)

---

## 📊 Data Flow Diagram

```
┌─────────────────┐
│  Telegram User  │
└────────┬────────┘
         │ /link ABC123
         ▼
┌─────────────────────────────┐
│  Telegram Webhook           │
│  POST /telegram/webhook     │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│ telegram.controller.js       │
│ _handleLinkCommand()        │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│ telegram.service.js          │
│ linkTelegramAccount()       │
└────────┬────────────────────┘
         │ Creates/Updates
         ▼
┌─────────────────────────────┐
│ TelegramUser Model           │
│ (linking_code TTL: 30 min)  │
└────────┬────────────────────┘
         │ Links to
         ▼
┌─────────────────────────────┐
│ User Model                   │
│ (telegram_id added)          │
└─────────────────────────────┘
```

---

## 💬 Task Creation Flow

```
┌──────────────────────────────┐
│ Telegram User sends:         │
│ "meeting tomorrow 5pm"       │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│ telegram.controller.js        │
│ _handleTaskCreation()        │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│ telegram.service.js           │
│ createTaskFromMessage()      │
└──────────────┬───────────────┘
               │ Calls MCP Server
               ▼
┌──────────────────────────────┐
│ MCP Server (Gemini AI)        │
│ Parses natural language      │
│ Extracts: title, due_at,     │
│ priority, duration, etc.     │
└──────────────┬───────────────┘
               │ Returns parsed task
               ▼
┌──────────────────────────────┐
│ task.service.create()         │
│ Existing task creation       │
└──────────────┬───────────────┘
               │
               ├─→ Calendar Sync
               ├─→ Notifications
               └─→ Reminders
               │
               ▼
┌──────────────────────────────┐
│ Telegram Bot Response:        │
│ "✅ Task created:             │
│  Meeting — Due: 5/22/2026"   │
└──────────────────────────────┘
```

---

## 🐛 Troubleshooting

### **Issue: Webhook not receiving updates**
```
Solution:
1. Verify TELEGRAM_WEBHOOK_URL is publicly accessible (HTTPS only)
2. Check TELEGRAM_BOT_TOKEN is valid
3. Test webhook with: curl -X POST https://your-url/telegram/webhook -H "Content-Type: application/json" -d '{"update_id":1,"message":{"text":"/start"}}'
```

### **Issue: Linking code not generating**
```
Solution:
1. Verify JWT token is valid
2. Check MongoDB connection
3. Ensure TELEGRAM_BOT_TOKEN is set in .env
4. Run: node test-telegram-integration.js "YOUR_JWT_TOKEN"
```

### **Issue: Tasks not creating from Telegram**
```
Solution:
1. Verify account is linked (/link command successful)
2. Check MCP Server is running (backend logs show MCP health)
3. Look for parse errors in backend logs
4. Test with simple message: "todo"
```

### **Issue: 404 errors in logs**
```
Solution:
During development with ngrok, 404 is expected when Telegram tries to set webhook.
In production, verify:
1. TELEGRAM_WEBHOOK_URL is correct and HTTPS
2. Bot token is valid
3. Domain is publicly accessible
```

---

## 📈 Monitoring & Logging

### **Backend Logs to Watch**
```
✅ Telegram webhook set to: {URL}
✅ Telegram bot started (polling mode)
✅ Task created from Telegram message
❌ Failed to link account
❌ Invalid or expired linking code
```

### **Database Monitoring**
```
// Check linked accounts
db.telegramusers.find({ is_linked: true })

// Check pending linking codes
db.telegramusers.find({ linking_code: { $exists: true } })

// Check link expiry (TTL index)
db.telegramusers.indexes()
```

---

## 🚀 Production Deployment

### **Requirements**
- ✅ HTTPS domain (Telegram requires HTTPS for webhooks)
- ✅ Public IP/domain accessible from internet
- ✅ Valid TELEGRAM_BOT_TOKEN from @BotFather
- ✅ MongoDB Atlas connection
- ✅ Environment variables properly set

### **Deployment Steps**

1. **Set production environment variables**:
   ```env
   TELEGRAM_BOT_TOKEN=your_token
   TELEGRAM_WEBHOOK_URL=https://yourdomain.com/telegram/webhook
   TELEGRAM_WEBHOOK_SECRET=strong_secret_token
   ```

2. **Deploy backend** to your server

3. **Test webhook connectivity**:
   ```bash
   curl -X POST https://yourdomain.com/telegram/webhook \
     -H "Content-Type: application/json" \
     -H "X-Telegram-Bot-Api-Secret-Token: your_secret" \
     -d '{"update_id":1,"message":{"text":"/start"}}'
   ```

4. **Monitor logs** for errors:
   ```bash
   # Check telegram webhook status
   tail -f logs/backend.log | grep -i telegram
   ```

---

## 📞 Support

For issues or questions:
1. Check troubleshooting section above
2. Review backend logs: `npm run dev`
3. Test endpoints: `node test-telegram-integration.js`
4. Verify .env variables are set correctly

---

## 🎯 Next Enhancements

- [ ] Inline buttons for quick task actions (/done, /edit, /delete)
- [ ] Rich task editing directly from Telegram
- [ ] Recurring task support with natural language ("every morning")
- [ ] Task reminders sent to Telegram
- [ ] Subtask creation via Telegram
- [ ] Team task assignment via bot
- [ ] Voice message support
- [ ] Media attachments (photos as task attachments)

---

**Last Updated:** May 22, 2026  
**Status:** ✅ Production Ready (Webhook Mode)
