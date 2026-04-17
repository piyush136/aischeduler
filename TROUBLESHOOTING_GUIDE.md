# Multi-Task Creation - Troubleshooting Guide

## Quick Troubleshooting

### ❌ "Error: Tool add_multiple_tasks not found"

**Cause**: Tool not properly registered

**Solution**:
1. Check `mcp-server/tools/index.js` has:
   ```javascript
   const addMultipleTasks = require('./addMultipleTasks.tool');
   ```
2. Check tool is in tools array:
   ```javascript
   const tools = [
     addTask,
     addMultipleTasks,  // ← Should be here
     ...
   ];
   ```
3. Restart MCP server

---

### ❌ "Task failed: Title is required"

**Cause**: One of the tasks has no title

**Solution**:
Make sure each task has a clear action/description:

❌ **Don't say:**
```
"Create tasks for tomorrow and next week"
```

✅ **Do say:**
```
"Create tasks: buy milk tomorrow, call dentist next week"
```

---

### ❌ "Task failed: Invalid date format"

**Cause**: Date format not recognized

**Solution**:
Use valid date formats:

✅ **Valid formats:**
- "today"
- "tomorrow"
- "next Monday"
- "this Friday"
- "2026-01-20"
- "January 20, 2026"

❌ **Invalid formats:**
- "someday"
- "later"
- "whenever"
- "next month" (too vague - specify exact date)

---

### ❌ "Error: Too many tasks"

**Cause**: Trying to create more than 50 tasks

**Solution**:
Split into multiple requests:

```
Request 1: Tasks 1-25
Request 2: Tasks 26-50
```

---

### ❌ "Only 2 tasks synced, but 3 created"

**Cause**: Google Calendar connection issue

**Solution**:
1. Check if Google account is connected in settings
2. Verify Google tokens are still valid
3. Check sync_debug.log for specific error
4. **Note**: Tasks ARE created locally, just not synced

---

### ❌ "Tasks created but no summary response"

**Cause**: Chat route not generating summary

**Solution**:
1. Check `mcp-server/routes/chat.route.js` has bulk response handling
2. Verify this code exists:
   ```javascript
   if (toolName === 'add_multiple_tasks' && toolResult.success) {
     summaryResponse = `✅ ${summary.created} tasks added...`;
   }
   ```
3. Restart chat server

---

### ❌ "Backend returning 500 error"

**Cause**: Server error in bulk creation

**Solution**:
1. Check `backend_error.log`:
   ```bash
   tail -f backend_error.log
   ```
2. Look for specific error message
3. Common issues:
   - Database connection
   - Invalid user ID
   - Mongoose validation error
4. Restart backend server

---

### ❌ "Validation errors for all tasks"

**Cause**: Prompt format not recognized

**Solution**:
Check your prompt structure:

✅ **Good structure:**
```
"I need to:
1. Buy milk tomorrow at 2pm
2. Call dentist Wednesday at 10am
3. Finish report Friday"
```

❌ **Poor structure:**
```
"Do stuff tomorrow and next week"
```

---

### ❌ "Getting 400: tasks must be a non-empty array"

**Cause**: No valid tasks extracted

**Solution**:
1. LLM didn't extract any tasks properly
2. Try with clearer task descriptions
3. Check system prompt was applied

---

### ❌ "Priority not being extracted correctly"

**Cause**: Keyword not recognized

**Solution**:
Use explicit priority keywords:

| Priority | Keywords |
|----------|----------|
| High (1) | urgent, ASAP, critical, immediately, important, high priority |
| Normal (3) | [default, no keyword needed] |
| Low (5) | eventually, low priority, when possible, no rush |

Example:
```
"Urgent: Fix bug today. Normal: review code. Low priority: update docs."
```

---

### ❌ "Recurrence not being detected"

**Cause**: Keyword not clear

**Solution**:
Use specific recurrence keywords:

```
✅ "Exercise every Monday and Wednesday at 6am"
❌ "Exercise regularly"

✅ "Team meeting every Thursday"
❌ "Team meeting often"

✅ "Gym every weekday at 6am"
❌ "Gym frequently"
```

---

### ❌ "Some tasks missing from response"

**Cause**: Validation errors on some tasks

**Solution**:
Check the response for `errors` field:
```json
{
  "success": true,
  "tasks": [...],
  "errors": [
    {
      "index": 1,
      "title": "Call mom",
      "error": "Invalid date format: 'someday'"
    }
  ]
}
```

Look at the specific error for each failed task.

---

## Diagnostic Checklist

### 1. Backend Not Working
```
□ Is backend running? (Port 3001)
□ Check package.json has axios
□ Check models/task.model.js exists
□ Check services/task.service.js has createBulk()
□ Check controllers/task.controller.js has createBulkTasks()
□ Check routes/task.routes.js has /bulk route
□ Check backend_error.log
```

### 2. MCP Tool Not Working
```
□ Is MCP server running? (Port 3002)
□ Check tools/addMultipleTasks.tool.js exists
□ Check tools/index.js imports addMultipleTasks
□ Check toolMap includes add_multiple_tasks
□ Run: node mcp-server/test-connection.js
```

### 3. LLM Not Extracting Multiple Tasks
```
□ Check mcp-server/routes/chat.route.js has new system prompt
□ Check system prompt includes MULTI-TASK instructions
□ Test with very clear task list
□ Check Gemini API key is valid
□ Try shorter/simpler prompt first
```

### 4. Google Calendar Not Syncing
```
□ Check user.google_tokens exists
□ Check tokens not expired
□ Check sync_debug.log
□ Try manual sync test
□ Verify calendar service available
```

---

## Debug Commands

### Check Backend Status
```bash
curl http://localhost:3001/health
```

### Check MCP Server Status
```bash
curl http://localhost:3002/health
```

### Test Bulk Endpoint Directly
```bash
curl -X POST http://localhost:3001/api/tasks/bulk \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tasks": [
      {"title": "Test 1", "due_at": "2026-01-20T10:00:00", "priority": 3},
      {"title": "Test 2", "due_at": "2026-01-21T14:00:00", "priority": 3}
    ]
  }'
```

### Run Test Suite
```bash
node test-bulk-tasks.js
```

### Check Logs
```bash
# Backend errors
tail -f backend_error.log

# Google Calendar sync
tail -f sync_debug.log

# Check if file exists
ls -la backend_error.log sync_debug.log
```

---

## Common Issues & Solutions

### Issue: "All tasks show priority 3"
**Reason**: Keyword extraction not working
**Fix**: Add explicit keywords (urgent, critical, low priority)

### Issue: "Dates all default to today"
**Reason**: Date parsing failed
**Fix**: Use clear date keywords (tomorrow, next Monday, etc.)

### Issue: "Recurrence always NONE"
**Reason**: Not mentioning repeat pattern
**Fix**: Add keywords like "every day", "weekdays", "every Monday"

### Issue: "Task creation slow (>5 seconds)"
**Reason**: Google Calendar sync is slow
**Fix**: Normal for >5 tasks; network dependent

### Issue: "Google Calendar sync fails intermittently"
**Reason**: API rate limiting
**Fix**: Space out requests; usually retries automatically

---

## Performance Issues

### Slow Bulk Creation

**Typical timings:**
- 1-2 tasks: 1-2 seconds
- 3-5 tasks: 2-3 seconds
- 6-10 tasks: 4-6 seconds
- 11-50 tasks: 10-30 seconds

**If slower than expected:**
1. Check database connection
2. Check Google Calendar API response time
3. Check network latency
4. Run: `npm run profile` (if available)

### High Error Rate

**If >50% tasks failing:**
1. Check input format
2. Test with simpler prompt
3. Verify all required fields present
4. Check logs for specific errors

---

## Advanced Troubleshooting

### Enable Detailed Logging

In `backend/controllers/task.controller.js`, add:
```javascript
console.log('[DEBUG] Input:', JSON.stringify(req.body, null, 2));
console.log('[DEBUG] Tasks processed:', results);
```

### Monitor Database Queries

In `backend/services/task.service.js`, add:
```javascript
console.time('[PERF] createBulk');
// ... code ...
console.timeEnd('[PERF] createBulk');
```

### Test LLM Prompt

In `mcp-server/routes/chat.route.js`, add:
```javascript
console.log('[LLM] System Prompt:', systemPrompt);
console.log('[LLM] Response:', llmResponse);
```

---

## When Nothing Else Works

### 1. Verify Installation
```bash
cd backend && npm install
cd ../mcp-server && npm install
cd ../frontend && npm install
```

### 2. Clear Cache
```bash
rm -rf node_modules package-lock.json
npm install
```

### 3. Restart Everything
```bash
# Kill all Node processes
pkill -f "node "

# Restart backend
cd backend && npm run dev

# Restart MCP (in new terminal)
cd mcp-server && npm run dev

# Restart frontend (in new terminal)
cd frontend && npm run dev
```

### 4. Check Logs
```bash
# All errors
grep -r "error\|Error\|ERROR" *.log

# Find timestamp of issue
grep "2026-01-20" *.log
```

### 5. Test Individual Components
```bash
# Test backend only
node backend/app.js

# Test MCP only
node mcp-server/server.js

# Test connection
node mcp-server/test-connection.js
```

---

## Getting Help

When reporting issues, include:

1. **Error message** - Exact text
2. **User input** - What you typed
3. **Expected output** - What should happen
4. **Actual output** - What actually happened
5. **Logs** - Content of relevant .log files
6. **Steps to reproduce** - How to trigger the issue

---

## Quick Reference

| Problem | Quick Fix |
|---------|-----------|
| Tool not found | Restart MCP server |
| Title required | Add clear action to each task |
| Invalid date | Use: today, tomorrow, next Monday |
| Too many tasks | Limit to 50 per request |
| No sync | Verify Google account connected |
| Slow response | Normal for 5+ tasks + sync |
| Empty errors | Check system prompt applied |
| Random failures | Check network/API rate limits |

---

**Last Updated**: January 20, 2026
**Version**: 1.0
**Status**: Complete

For detailed info, see:
- [MULTI_TASK_CREATION_GUIDE.md](MULTI_TASK_CREATION_GUIDE.md)
- [IMPLEMENTATION_DETAILS.md](IMPLEMENTATION_DETAILS.md)
