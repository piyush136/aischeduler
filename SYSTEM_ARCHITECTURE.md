# System Architecture & Data Flow

## Complete Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          FRONTEND (React)                                   │
│                        http://localhost:5173                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  User: "Add task for tomorrow at 7am"                                      │
│    ↓                                                                         │
│  ChatWidget Component                                                       │
│    ├─ Collects message                                                     │
│    └─ Sends to backend MCP route                                          │
│       POST /api/chat { message: "..." }                                    │
│                                                                              │
└────────────────────┬──────────────────────────────────────────────────────── ┘
                     │
                     │ (HTTP)
                     ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│                      BACKEND (Express.js)                                    │
│                    http://localhost:5000                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  POST /api/chat                                                             │
│    ├─ Authenticates user                                                   │
│    └─ Forwards to MCP Server                                              │
│       ├─ message: "Add task for tomorrow..."                              │
│       └─ Authorization: Bearer {token}                                    │
│                                                                              │
└────────────────────┬──────────────────────────────────────────────────────── ┘
                     │
                     │ (HTTP)
                     ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│                    MCP SERVER (Model Context Protocol)                       │
│                      http://localhost:3001                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  POST /chat                                                                 │
│    ↓                                                                         │
│  Step 1: Create System Prompt with Current Date ✅ NEW                      │
│    ├─ Current Time: const now = new Date()                                │
│    ├─ Format: "You are an AI Task Assistant."                            │
│    ├─ Include: "The current date and time is: ${now.toLocaleString()}"   │
│    ├─ Include: "Always use ISO-8601 format (YYYY-MM-DDTHH:mm:ss)"       │
│    └─ Example: "The current date and time is: 1/18/2026, 2:30 PM"       │
│                                                                              │
│  Step 2: Call LLM (Gemini) with System Prompt ✅ UPDATED                   │
│    ├─ Message: "Add task for tomorrow at 7am"                            │
│    ├─ System Prompt: (from Step 1 above)                                │
│    ├─ Tools: [add_task, get_tasks, update_task, ...]                   │
│    └─ Result: LLM knows today = Jan 18 → tomorrow = Jan 19             │
│                                                                              │
│  Step 3: LLM Processes with Date Context                                   │
│    ├─ Interprets: "tomorrow at 7am"                                      │
│    ├─ Calculates: 2026-01-19T07:00:00                                   │
│    └─ Generates: Function call to add_task                              │
│                                                                              │
│  Step 4: Execute add_task Tool ✅ ENHANCED                                 │
│    ├─ Input: {                                                           │
│    │   title: "Buy groceries",                                           │
│    │   due_at: "2026-01-19T07:00:00"  ← ISO-8601 format!              │
│    │ }                                                                    │
│    ├─ Validation:                                                        │
│    │   ├─ Check: Is it ISO-8601? YES ✓                                 │
│    │   ├─ Parse: 2026-01-19T07:00:00 ✓                                │
│    │   ├─ Verify: Valid date? YES ✓                                    │
│    │   └─ Log: "[addTask] Valid ISO datetime: 2026-01-19T07:00:00"    │
│    │                                                                    │
│    ├─ Send to Backend:                                                 │
│    │   POST /tasks                                                     │
│    │   { title: "Buy groceries", due_at: "2026-01-19T07:00:00" }      │
│    │                                                                    │
│    └─ Result: { success: true, task: { ... } }                        │
│                                                                              │
│  Step 5: Generate Natural Response                                         │
│    ├─ LLM receives tool result                                          │
│    ├─ Generates: "I've added your task for tomorrow at 7am"           │
│    └─ Return to user                                                    │
│                                                                              │
└────────────────────┬──────────────────────────────────────────────────────── ┘
                     │
                     │ (HTTP)
                     ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│                    BACKEND Task Creation ✅ NEW LOGGING                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  POST /tasks                                                                │
│    ├─ Authenticate: User ID verified                                      │
│    ├─ Log Received: "[TaskController] Received task data:"               │
│    │   { title: "Buy groceries", due_at: "2026-01-19T07:00:00" }       │
│    │                                                                    │
│    ├─ Parse Date: New Date("2026-01-19T07:00:00")                     │
│    ├─ Log Parsed: "[TaskController] Parsed due_at:"                    │
│    │   {                                                               │
│    │     raw: "2026-01-19T07:00:00",                                 │
│    │     parsed: "2026-01-19T07:00:00.000Z",                         │
│    │     date: "Sun Jan 19 2026",                                    │
│    │     time: "07:00:00 GMT"                                        │
│    │   }                                                               │
│    │                                                                    │
│    ├─ Create Task Document:                                           │
│    │   {                                                               │
│    │     _id: ObjectId(...),                                         │
│    │     title: "Buy groceries",                                     │
│    │     due_at: ISODate("2026-01-19T07:00:00Z"),  ← CORRECT DATE! │
│    │     user_id: ObjectId(...),                                    │
│    │     status: "pending",                                          │
│    │     priority: 3,                                                │
│    │     created_at: ISODate("2026-01-18T14:30:00Z")               │
│    │   }                                                               │
│    │                                                                    │
│    ├─ Save to MongoDB                                                 │
│    ├─ Log Success: "[TaskController] Task created:"                  │
│    │   { id: "...", title: "Buy groceries",                         │
│    │     due_at: "2026-01-19T07:00:00.000Z" }                       │
│    │                                                                    │
│    └─ Optional: Sync with Google Calendar                           │
│                                                                              │
└────────────────────┬──────────────────────────────────────────────────────── ┘
                     │
                     │ (HTTP Response)
                     ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│                      FRONTEND Display ✅                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Response received:                                                         │
│    {                                                                        │
│      reply: "I've added your task for tomorrow at 7am!",                  │
│      data: {                                                               │
│        task: {                                                             │
│          _id: "...",                                                       │
│          title: "Buy groceries",                                          │
│          due_at: "2026-01-19T07:00:00Z",  ← CORRECT DATE!              │
│          status: "pending"                                                │
│        }                                                                   │
│      }                                                                     │
│    }                                                                        │
│                                                                              │
│  Display Task:                                                              │
│    ├─ Title: "Buy groceries"                                             │
│    ├─ Date: "Tomorrow, Jan 19" ✅                                         │
│    ├─ Time: "7:00 AM" ✅                                                  │
│    └─ Status: "Pending"                                                   │
│                                                                              │
└────────────────────┬──────────────────────────────────────────────────────── ┘
                     │
                     ↓
             ✅ SUCCESS! Task created with CORRECT DATE
```

---

## Key Improvements in Flow

### 1️⃣ System Prompt with Date Context
```
BEFORE: LLM gets: "Add task for tomorrow at 7am"
        → Doesn't know what "today" is
        → Can't calculate "tomorrow"

AFTER:  LLM gets: "Add task for tomorrow at 7am"
        + System: "Current date: 1/18/2026, 2:30 PM"
        → Knows today = Jan 18
        → Calculates tomorrow = Jan 19 ✓
```

### 2️⃣ ISO-8601 Date Format
```
BEFORE: Tool receives: time "07:00"
        → No date info
        → Defaults to today ✗

AFTER:  Tool receives: "2026-01-19T07:00:00"
        → Has complete date
        → Validates format ✓
        → Uses correct date ✓
```

### 3️⃣ Comprehensive Logging
```
BEFORE: Silent process, no trace
        → Hard to debug ✗

AFTER:  Full audit trail:
        [LLM] System Prompt: Current date is...
        [addTask] Valid ISO datetime: 2026-01-19T07:00:00
        [TaskController] Parsed due_at: { date: 'Sun Jan 19 2026' }
        → Easy to trace ✓
```

---

## Component Interactions

### MCP → Backend → Database

```
┌──────────────────┐
│   MCP Server     │
│   (Port 3001)    │
└────────┬─────────┘
         │ POST /tasks
         │ JSON: { title: "...", due_at: "2026-01-19T07:00:00" }
         │
         ↓
┌──────────────────┐
│    Backend       │
│   (Port 5000)    │
│                  │
│ ✓ Validate date  │
│ ✓ Log received   │
│ ✓ Create object  │
│ ✓ Save to DB     │
└────────┬─────────┘
         │ Response
         │ JSON: { _id: "...", due_at: "ISODate(...)" }
         │
         ↓
┌──────────────────┐
│   MongoDB        │
│                  │
│ Task Document:   │
│ {                │
│  title: "...",   │
│  due_at: Date,   │ ← Correct!
│  user_id: "..."  │
│ }                │
└──────────────────┘
```

---

## Data Format Through Pipeline

```
┌─────────────────────────────────────────────────────────────────┐
│                     TRANSFORMATION STAGES                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│ Stage 1: User Input (String)                                    │
│ ─────────────────────────────────────────────────────────────   │
│ "Add task for tomorrow at 7am"                                 │
│                                                                   │
│                           ↓                                       │
│                                                                   │
│ Stage 2: LLM Processing (with date context)                    │
│ ─────────────────────────────────────────────────────────────   │
│ Knows: Today = Jan 18                                          │
│ Calculates: Tomorrow = Jan 19 at 07:00                        │
│ Outputs: Function call with args:                             │
│   {                                                             │
│     title: "task",                                             │
│     due_at: "2026-01-19T07:00:00"                             │
│   }                                                             │
│                                                                   │
│                           ↓                                       │
│                                                                   │
│ Stage 3: Tool Validation                                       │
│ ─────────────────────────────────────────────────────────────   │
│ Check: Is due_at in ISO-8601 format? YES ✓                    │
│ Parse: Can parse "2026-01-19T07:00:00"? YES ✓                │
│ Verify: Is it a valid date? YES ✓                             │
│                                                                   │
│                           ↓                                       │
│                                                                   │
│ Stage 4: Backend Processing                                    │
│ ─────────────────────────────────────────────────────────────   │
│ Received: "2026-01-19T07:00:00"                               │
│ Parsed: Date object = Sun Jan 19 2026 07:00:00 GMT            │
│ Stored: ISODate("2026-01-19T07:00:00Z")                       │
│                                                                   │
│                           ↓                                       │
│                                                                   │
│ Stage 5: Database                                              │
│ ─────────────────────────────────────────────────────────────   │
│ {                                                               │
│   _id: ObjectId("..."),                                        │
│   title: "task",                                               │
│   due_at: ISODate("2026-01-19T07:00:00Z"),  ← CORRECT!       │
│   user_id: ObjectId("..."),                                   │
│   created_at: ISODate("2026-01-18T14:30:00Z")                │
│ }                                                               │
│                                                                   │
│                           ↓                                       │
│                                                                   │
│ Stage 6: Frontend Display                                      │
│ ─────────────────────────────────────────────────────────────   │
│ Title: "task"                                                  │
│ Date: "Tomorrow, January 19" ✓                                │
│ Time: "7:00 AM" ✓                                             │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Error Prevention Layers

```
┌─ User Input ──────────┐
│  "tomorrow at 7am"    │
└────────┬──────────────┘
         │
         ↓ Layer 1: LLM knows date
    ┌─────────────────────────────┐
    │ LLM CONTEXT CHECK           │
    │ ✓ Has current date          │
    │ ✓ Can calculate "tomorrow"  │
    └────────┬────────────────────┘
             │
             ↓ Output: ISO-8601
    ┌─────────────────────────────┐
    │ TOOL VALIDATION             │
    │ ✓ Format is ISO-8601        │
    │ ✓ Date is valid             │
    │ ✓ Time is valid             │
    └────────┬────────────────────┘
             │
             ↓
    ┌─────────────────────────────┐
    │ BACKEND PARSING             │
    │ ✓ Parse ISO string to Date  │
    │ ✓ Verify it's valid         │
    │ ✓ Log for audit             │
    └────────┬────────────────────┘
             │
             ↓
    ┌─────────────────────────────┐
    │ DATABASE STORAGE            │
    │ ✓ Save as ISODate           │
    │ ✓ Timezone handled (UTC)    │
    └────────┬────────────────────┘
             │
             ↓
        ✅ CORRECT
```

---

## Configuration Points

### Environment Variables Needed

```
BACKEND_URL=http://localhost:5000
GEMINI_API_KEY=your-api-key-here
GEMINI_MODEL=gemini-2.0-flash
JWT_SECRET=your-secret-key
MONGODB_URI=mongodb://localhost:27017/task_db
```

### Port Configuration

```
Frontend:    http://localhost:5173
Backend:     http://localhost:5000
MCP Server:  http://localhost:3001
MongoDB:     localhost:27017
```

---

## Monitoring Points

```
┌─ Frontend ────────────────────────────────────┐
│ Browser Console                               │
│ ├─ API requests/responses                    │
│ ├─ Chat messages                             │
│ └─ Task display with dates                   │
└───────────────────────────────────────────────┘
           ↓
┌─ MCP Server (Terminal) ───────────────────────┐
│ [LLM] System Prompt: Current date: 1/18...   │
│ [addTask] Valid ISO datetime: 2026-01-19...  │
│ [MCP] Task created successfully              │
└───────────────────────────────────────────────┘
           ↓
┌─ Backend Server (Terminal) ───────────────────┐
│ [TaskController] Received: { ..., due_at }   │
│ [TaskController] Parsed: { date, time, ... } │
│ [TaskController] Created: { ..., due_at OK } │
└───────────────────────────────────────────────┘
           ↓
┌─ Database ────────────────────────────────────┐
│ Task Document:                                │
│ { ..., due_at: ISODate("2026-01-19T...") }   │
└───────────────────────────────────────────────┘
```

---

This diagram shows how all components work together to create tasks with the correct dates! ✨
