# 🔍 Monitoring & Debugging the Date Fix

## Where to Check Logs

### 1. MCP Server Terminal

**Watch for these logs** when you send a date-related task:

```bash
[LLM] Processing message via Gemini REST API
[LLM] System Prompt: You are an AI Task Assistant. The current date and time is: 1/18/2026, 2:30 PM
[LLM] Function call detected: add_task
[MCP] Executing tool: add_task
[MCP] Tool result: { success: true, task: { ... } }
```

**More detailed addTask logs:**
```bash
[addTask] Received args: { 
  title: 'Buy groceries', 
  due_at: '2026-01-19T07:00:00' 
}
[addTask] Original due_at: 2026-01-19T07:00:00
[addTask] Valid ISO datetime: 2026-01-19T07:00:00
[addTask] Final due_at: 2026-01-19T07:00:00
[addTask] Task data being sent to backend: { 
  title: 'Buy groceries', 
  due_at: '2026-01-19T07:00:00',
  priority: 3
}
[addTask] Task created successfully: {
  _id: '...',
  title: 'Buy groceries',
  due_at: '2026-01-19T07:00:00Z',
  ...
}
```

### 2. Backend Server Terminal

**Watch for task creation logs:**
```bash
[TaskController] Creating task by: user_123
[TaskController] Received task data: { 
  title: 'Buy groceries', 
  due_at: '2026-01-19T07:00:00' 
}
[TaskController] Parsed due_at: {
  raw: '2026-01-19T07:00:00',
  parsed: '2026-01-19T07:00:00.000Z',
  date: 'Sun Jan 19 2026',
  time: '07:00:00 GMT'
}
[TaskController] Task created: {
  id: '507f1f77bcf86cd799439011',
  title: 'Buy groceries',
  due_at: '2026-01-19T07:00:00.000Z'
}
```

### 3. Browser Console

**Frontend will show:**
- Chat responses from MCP server
- Task data that was created
- Any errors from the chat endpoint

**Open**: Browser DevTools → Console tab

### 4. Sync Debug Log File

**Optional**: Backend creates `sync_debug.log` when syncing with Google Calendar
```bash
[2026-01-18T14:30:45.123Z] Syncing task 507f1f77bcf86cd799439011 to Google...
[2026-01-18T14:30:46.456Z] Sync Success. Event ID: abc123xyz789
```

---

## Test Cases & Expected Logs

### Test 1: "Add task for tomorrow at 7am"

**User Input:**
```
Chat: "Add a task called Shopping for tomorrow at 7am"
```

**Expected MCP Logs:**
```
[LLM] System Prompt: ...The current date and time is: 1/18/2026, 2:30 PM
[addTask] Received args: { title: 'Shopping', due_at: '2026-01-19T07:00:00' }
[addTask] Valid ISO datetime: 2026-01-19T07:00:00 ✓
```

**Expected Backend Logs:**
```
[TaskController] Parsed due_at: { date: 'Sun Jan 19 2026', time: '07:00:00 GMT' } ✓
```

**Expected Result:**
- Task created with `due_at: 2026-01-19T07:00:00` ✅

---

### Test 2: "Add task for next Monday at 2pm"

**User Input:**
```
Chat: "Create reminder for next Monday at 2pm"
```

**Expected MCP Logs:**
```
[LLM] ...The current date and time is: 1/18/2026, 2:30 PM
[addTask] Received args: { title: '...', due_at: '2026-01-20T14:00:00' }
```

**Expected Result:**
- Task created for Monday (Jan 20) at 2 PM ✅

---

### Test 3: "Add task for specific date"

**User Input:**
```
Chat: "Add task Project deadline for January 25th at 9am"
```

**Expected MCP Logs:**
```
[addTask] Valid ISO datetime: 2026-01-25T09:00:00 ✓
```

**Expected Result:**
- Task created for Jan 25 at 9 AM ✅

---

## Debugging Checklist

Use this to troubleshoot if dates are still wrong:

### ✅ System Prompt Being Passed?
Look for in **MCP logs**:
```
[LLM] System Prompt: You are an AI Task Assistant. The current date and time is:
```
- ✅ If you see this → System prompt is working
- ❌ If you don't see this → Check `chat.route.js` has system prompt code

### ✅ Date Format Correct?
Look for in **MCP logs**:
```
[addTask] Valid ISO datetime: 2026-01-XX T HH:MM:SS
```
- ✅ If "Valid ISO datetime" → LLM calculated date correctly
- ❌ If error about format → Check date was properly formatted

### ✅ Backend Received It?
Look for in **Backend logs**:
```
[TaskController] Received task data: { ..., due_at: '2026-01-XXX...' }
```
- ✅ If present → Backend got the date
- ❌ If missing → Check network connection

### ✅ Task Created With Right Date?
Look for in **Backend logs**:
```
[TaskController] Parsed due_at: { date: 'XXX Jan XX 2026', time: 'XX:XX:XX GMT' }
```
- ✅ If date matches what you requested → SUCCESS
- ❌ If shows today's date → Date wasn't sent correctly

---

## Common Issues & Solutions

### Issue: Date showing as today instead of tomorrow

**Step 1**: Check MCP logs for system prompt
```
[LLM] System Prompt: You are an AI Task Assistant...
```
- ✅ Present? → Go to Step 2
- ❌ Missing? → Restart MCP server (chat.route.js change)

**Step 2**: Check if LLM calculated correct date
```
[addTask] Valid ISO datetime: 2026-01-19T07:00:00
```
- ✅ Shows tomorrow's date? → Go to Step 3
- ❌ Shows today's date? → LLM didn't calculate correctly, try asking "What is tomorrow's date?"

**Step 3**: Check backend received it
```
[TaskController] Parsed due_at: { date: 'Sun Jan 19 2026' }
```
- ✅ Shows correct date? → Database issue, check MongoDB
- ❌ Shows today? → Date wasn't sent from MCP, restart both servers

### Issue: "Time only" warning appears

**Log shows:**
```
[addTask] Time-only string detected (bug!). Converting to today: 07:00
[addTask] Converted to: 2026-01-18T07:00:00Z
```

**Solution**: This means LLM only sent time without date. Check:
1. Is system prompt being used? (See logs above)
2. Ask chatbot: "What is today's date?" to verify it knows
3. Try a different phrasing: "Add task for January 19 at 7am"

### Issue: Invalid date format error

**Log shows:**
```
[addTask] Unrecognized date format: xyz
{
  success: false,
  error: "Unrecognized date format: xyz..."
}
```

**Solution**: LLM sent invalid date format. Try:
1. Check browser console for the error
2. Ask LLM to clarify: "Can you format that as YYYY-MM-DD?"
3. Restart and try again

---

## Performance Metrics to Monitor

### Logging Should Show:

| Metric | Normal | Issue |
|--------|--------|-------|
| LLM Response Time | < 5s | > 10s = API issue |
| Date Parsing Time | < 100ms | > 500ms = validation loop |
| Backend Create Time | < 500ms | > 2s = Database slow |
| Sync Time | < 2s | > 5s = Google API slow |

---

## How to Clear Logs

If logs get too cluttered:

**MCP Terminal**: Press `Ctrl+C` to stop, then restart
**Backend Terminal**: Press `Ctrl+C` to stop, then restart
**Sync Log**: Delete `sync_debug.log` file if exists
**Backend Errors**: Delete `backend_error.log` file if exists

---

## Real-time Monitoring

### Watch MCP in Real-time:
```bash
# In MCP server folder
npm start 2>&1 | grep -E "LLM|addTask|MCP"
```

### Watch Backend in Real-time:
```bash
# In backend folder
npm start 2>&1 | grep "TaskController"
```

### Watch Both:
Open two terminal tabs, run each server separately, watch logs side-by-side

---

## Automated Testing

Run the provided test script:
```bash
node mcp-server/test-connection.js
```

This will:
- ✓ Test MCP connection
- ✓ Test date parsing for multiple scenarios
- ✓ Test backend task creation
- ✓ Report any issues found

---

**Happy debugging! 🔍** If you see the logs as described above, everything is working correctly! ✅
