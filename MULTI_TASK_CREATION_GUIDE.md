# Multiple Task Creation Implementation

## Overview

This implementation adds support for creating multiple tasks from a single prompt. The system now intelligently:
- Detects when a user mentions multiple tasks
- Extracts all tasks from the prompt using the Gemini LLM
- Creates them in bulk using a new backend endpoint
- Syncs them with Google Calendar
- Returns a summarized response

## Architecture

### 1. Backend Layer (`/backend`)

#### New Bulk Endpoint
- **Route**: `POST /api/tasks/bulk`
- **Location**: [backend/routes/task.routes.js](backend/routes/task.routes.js)
- **Description**: Accepts an array of tasks and creates them atomically

#### Controller Enhancement
- **File**: [backend/controllers/task.controller.js](backend/controllers/task.controller.js)
- **New Method**: `createBulkTasks()`
- **Features**:
  - Validates input array (1-50 tasks)
  - Creates all tasks in database
  - Syncs each task with Google Calendar after DB insertion
  - Returns detailed summary with success/failure counts
  - Handles errors gracefully (partial success is acceptable)

#### Service Layer Enhancement
- **File**: [backend/services/task.service.js](backend/services/task.service.js)
- **New Method**: `createBulk(tasksData, userId)`
- **Features**:
  - Validates each task individually
  - Rejects Google Calendar source tasks
  - Returns created tasks and failed items with error messages
  - Non-blocking validation (one task failure doesn't stop others)

### 2. MCP Layer (`/mcp-server`)

#### New Tool: `add_multiple_tasks`
- **File**: [mcp-server/tools/addMultipleTasks.tool.js](mcp-server/tools/addMultipleTasks.tool.js)
- **Description**: MCP tool for creating multiple tasks
- **Parameters**:
  ```json
  {
    "tasks": [
      {
        "title": "string (required)",
        "due_at": "ISO-8601 datetime (required)",
        "priority": "1-5 (optional, default 3)",
        "recurrence": "string (optional)",
        "recurrence_end_date": "ISO-8601 date (optional)",
        "description": "string (optional)",
        "subtasks": "array (optional)"
      }
    ]
  }
  ```

#### Tool Features
- Validates all tasks before sending
- Handles natural language date parsing
- Extracts priority from keywords
- Detects recurrence patterns
- Provides detailed error reporting
- Returns creation summary

#### Tools Registry
- **File**: [mcp-server/tools/index.js](mcp-server/tools/index.js)
- Updated to export `add_multiple_tasks` tool

### 3. LLM Layer (`/mcp-server/llm`)

#### Enhanced System Prompt
- **File**: [mcp-server/routes/chat.route.js](mcp-server/routes/chat.route.js)
- **Enhancements**:
  - Clear instructions for multi-task extraction
  - Decision tree: 1 task → use `add_task`, 2+ tasks → use `add_multiple_tasks`
  - JSON format specification for bulk operations
  - Validation checklist for task fields
  - Default values (date=today, time=09:00, priority=3)

#### Chat Route Enhancement
- **File**: [mcp-server/routes/chat.route.js](mcp-server/routes/chat.route.js)
- **New Features**:
  - Detects `add_multiple_tasks` tool calls
  - Generates summarized response: "✅ 5 tasks added. 4 synced with Google Calendar."
  - Passes bulk operation summary to LLM for final response generation

## Data Flow

```
User Input: "Buy milk tomorrow at 2pm, call dentist next Wednesday, finish report by Friday"
    ↓
LLM (Gemini) with enhanced prompt
    ↓
Identifies 3 tasks → Calls add_multiple_tasks
    ↓
Tool validates and formats tasks
    ↓
POST /api/tasks/bulk with array
    ↓
Backend creates all tasks (atomic operation)
    ↓
For each created task:
    ├→ Save to MongoDB
    └→ Sync to Google Calendar (if connected)
    ↓
Return summary:
{
  "success": true,
  "summary": {
    "totalRequested": 3,
    "created": 3,
    "failed": 0,
    "synced": 2
  },
  "tasks": [...],
  "syncErrors": [...]
}
    ↓
Chat route generates: "✅ 3 tasks added successfully. 2 synced with Google Calendar."
    ↓
User sees response in UI
```

## Key Features

### 1. Smart Task Extraction
- Parses multiple tasks from single prompt
- Handles various natural language formats
- Validates all required fields
- Rejects invalid entries with clear error messages

### 2. Atomic Operations
- All tasks created in database first
- Google Calendar sync happens after DB insertion
- Partial success is handled gracefully
- Failed tasks are reported with reasons

### 3. Google Calendar Sync
- Happens after bulk DB insertion (not before)
- Individual sync failures don't stop other tasks
- Returns sync status in response
- Logs all sync operations

### 4. Comprehensive Validation
- Title required and non-empty
- Due date must be ISO-8601 format
- Priority must be 1-5 (defaults to 3)
- Maximum 50 tasks per request
- Empty array rejected

### 5. Error Handling
- Validation errors reported per task
- Sync errors logged and returned
- Partial success accepted
- Clear error messages in response

## API Response Format

### Success Response
```json
{
  "success": true,
  "summary": {
    "totalRequested": 5,
    "created": 5,
    "failed": 0,
    "synced": 4
  },
  "tasks": [
    {
      "_id": "...",
      "title": "Buy groceries",
      "due_at": "2026-01-20T14:00:00.000Z",
      "priority": 3,
      "user_id": "..."
    }
  ],
  "syncErrors": [
    {
      "taskId": "...",
      "error": "Google Calendar sync failed: Invalid token"
    }
  ]
}
```

### Error Response
```json
{
  "error": "Failed to create bulk tasks",
  "details": "Invalid input: tasks must be a non-empty array"
}
```

## LLM Behavior

### Decision Logic

**When user says:**
- Single task → Uses `add_task`
- 2+ tasks → Uses `add_multiple_tasks`
- Complex task → Uses `create_complex_task`
- Query tasks → Uses `get_today_tasks` or `list_events`

### Example Prompts

**Single Task:**
```
"Remind me to buy milk tomorrow at 2pm"
→ Uses: add_task
→ Response: "✅ Task created: Buy milk"
```

**Multiple Tasks:**
```
"I need to: 1) Buy groceries today at 5pm, 2) Call mom tomorrow morning, 3) Finish the report by Friday"
→ Uses: add_multiple_tasks
→ Response: "✅ 3 tasks added successfully. 3 synced with Google Calendar."
```

**With Priorities:**
```
"Create urgent: fix bug today, low priority: update docs this week, normal: review PR tomorrow"
→ Uses: add_multiple_tasks
→ Extracts priorities: 1, 5, 3
→ Response: "✅ 3 tasks added. All synced with Google Calendar."
```

## Testing

Run the test suite:
```bash
node test-bulk-tasks.js
```

### Test Coverage
- Backend bulk endpoint creation
- Validation (empty array, missing fields)
- Maximum task limit (50 tasks)
- Single task processing
- MCP tool invocation
- Google Calendar sync
- Error handling

## Configuration

No additional configuration needed. The system uses:
- Existing `GEMINI_API_KEY` for LLM
- Existing `BACKEND_URL` for API calls
- Existing Google Calendar credentials for sync

## Performance Considerations

- **Database**: Bulk insert optimized for multiple documents
- **Google Calendar**: Sequential sync to avoid rate limiting
- **Validation**: Pre-validated before DB insertion
- **Response**: Streamed to client once complete

## Error Scenarios

### Validation Errors
- Empty tasks array
- Missing title
- Invalid date format
- Priority out of range (1-5)
- Too many tasks (>50)

### Creation Errors
- Database connection failure
- Invalid user ID
- Duplicate task detection (if enabled)
- Storage quota exceeded

### Sync Errors
- Google Calendar API error
- Invalid refresh token
- Rate limit exceeded
- Invalid event format

## Future Enhancements

1. **Batch Validation**: Return all validation errors at once before processing
2. **Partial Rollback**: Option to rollback all tasks if any sync fails
3. **Dry Run Mode**: Validate without creating (useful for testing)
4. **Async Processing**: Queue bulk creation for very large batches
5. **Duplicate Detection**: Check for similar tasks in same time slot
6. **Smart Scheduling**: Suggest alternative times if conflicts detected

## Files Modified

1. `backend/controllers/task.controller.js` - Added `createBulkTasks()`
2. `backend/services/task.service.js` - Added `createBulk()`
3. `backend/routes/task.routes.js` - Added POST /bulk route
4. `mcp-server/tools/addMultipleTasks.tool.js` - New file
5. `mcp-server/tools/index.js` - Added addMultipleTasks export
6. `mcp-server/routes/chat.route.js` - Enhanced system prompt and response handling

## Verification Checklist

- [x] Backend bulk endpoint created and working
- [x] Service layer supports bulk operations
- [x] MCP tool added and registered
- [x] LLM prompt updated for multi-task extraction
- [x] Chat route enhanced with bulk summary
- [x] Google Calendar sync after bulk creation
- [x] Error handling and validation
- [x] Test suite created
- [x] Documentation complete

## Support

For issues or questions about the multi-task creation feature:
1. Check the logs in `backend_error.log` and `sync_debug.log`
2. Review the test output from `test-bulk-tasks.js`
3. Verify LLM is correctly identifying multiple tasks in the prompt
4. Ensure Google Calendar tokens are valid if sync is failing
