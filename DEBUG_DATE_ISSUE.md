# Date/Time Bug Fix - Debug Guide

## Issue Description
When asking the AI to "add a task for tomorrow at 7am", the task was being created with today's date instead of tomorrow's date.

## Root Causes Found & Fixed

### 1. **LLM Wasn't Receiving Current Date Context**
- **Problem**: The LLM (Gemini) didn't know the current date/time, so it couldn't properly interpret relative date references like "tomorrow", "next week", etc.
- **Fix**: Added a system prompt in `/mcp-server/routes/chat.route.js` that includes:
  - Current date and time
  - Instructions to convert natural language dates to ISO-8601 format
  - Example: "tomorrow at 7am" → "2026-01-19T07:00:00"

### 2. **Incomplete Date Parsing in MCP Tool**
- **Problem**: The `addTask.tool.js` only handled time-only strings (like "07:00") but would apply them to TODAY's date instead of tomorrow.
- **Fix**: Improved date validation and parsing:
  - Validates ISO-8601 datetime strings properly
  - Handles date-only strings (adds default time 00:00:00)
  - Provides clear error messages for invalid formats
  - Logs all date conversions for debugging

### 3. **Insufficient Logging for Debugging**
- **Problem**: It was hard to trace where the date was getting set incorrectly.
- **Fix**: Added detailed logging at multiple levels:
  - MCP Tool: Logs received date, conversion steps, and final date sent to backend
  - Backend Controller: Logs received data, parsed date, and created task details

## How to Test the Fix

### Test Case 1: Tomorrow at Specific Time
**Command**: "Add a task to buy groceries tomorrow at 7am"

**Expected Flow**:
1. LLM receives current date/time context
2. LLM interprets "tomorrow at 7am" as "2026-01-19T07:00:00" (if today is 2026-01-18)
3. MCP tool receives ISO-8601 datetime string
4. Task is created with correct due_at date

**Check Logs**:
```
[MCP] Executing tool: add_task
[addTask] Received args: { title: 'buy groceries', due_at: '2026-01-19T07:00:00' }
[addTask] Valid ISO datetime: 2026-01-19T07:00:00
[addTask] Task created successfully
[TaskController] Parsed due_at: {
  raw: '2026-01-19T07:00:00Z',
  parsed: '2026-01-19T07:00:00.000Z',
  date: 'Sun Jan 19 2026',
  time: '07:00:00 GMT'
}
```

### Test Case 2: Specific Date and Time
**Command**: "Create task 'Project deadline' for January 25th at 3pm"

**Expected**: Task created with due_at = "2026-01-25T15:00:00"

### Test Case 3: Just Time (Should Fail or Default to Today)
**Command**: (Don't explicitly say "at 7am without a date")

**Expected**: Tool logs a warning and defaults to today

## Files Modified

### 1. `/mcp-server/routes/chat.route.js`
- Added system prompt with current date/time context
- Passed systemPrompt to LLM

### 2. `/mcp-server/llm/client.js`
- Updated `run()` method to use `systemInstruction` in Gemini API payload
- Logs system prompt for debugging

### 3. `/mcp-server/tools/addTask.tool.js`
- Improved date validation for multiple formats
- Added comprehensive logging for date conversions
- Better error messages for invalid formats

### 4. `/backend/controllers/task.controller.js`
- Added logging of received task data
- Logs parsed due_at date in multiple formats
- Helps identify where date issues occur

## How to Monitor

### Watch MCP Tool Logs (Terminal Running MCP Server)
```bash
# Look for these patterns:
[addTask] Received args:
[addTask] Original due_at:
[addTask] Valid ISO datetime:
[addTask] Converted to:
[addTask] Final due_at:
```

### Watch Backend Logs (Terminal Running Backend)
```bash
# Look for these patterns:
[TaskController] Received task data:
[TaskController] Parsed due_at: { raw, parsed, date, time }
```

### Check Browser Console
The frontend will show the response from the MCP server with the task that was created.

## Next Steps if Still Having Issues

1. **Check System Clock**: Make sure your computer's date/time is correct
2. **Test Direct API Call**: Send a curl request to test:
   ```bash
   curl -X POST http://localhost:5000/tasks \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "title": "Test Task",
       "due_at": "2026-01-19T07:00:00"
     }'
   ```
3. **Verify MCP Server**: Ensure the system prompt is being sent (check terminal logs)
4. **Test LLM Directly**: Ask the chatbot "What is today's date?" to verify it knows the current date

## Expected Behavior After Fix

✅ "Add task for tomorrow at 7am" → Creates task with tomorrow's date at 7am
✅ "Add task for next Monday at 3pm" → Calculates correct date
✅ "Add task for Jan 25 at 9am" → Correctly parses the date
✅ Clear error messages if date format is ambiguous or invalid
