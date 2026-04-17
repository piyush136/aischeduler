# 🏗️ ARCHITECTURE: Recurring Tasks & Sub-tasks

## System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐ │
│  │   Add Task UI    │  │   Voice Input    │  │   Chat Widget    │ │
│  │                  │  │   🎤             │  │   💬             │ │
│  │ • Title          │  │ • Continuous    │  │ • NLP            │ │
│  │ • Date/Time      │  │ • Interim text  │  │ • Commands       │ │
│  │ • Priority       │  │ • Auto-stop     │  │ • Smart detect   │ │
│  │ • Repeat ⭐     │  │ • Sub-tasks    │  │ • Recurrence    │ │
│  │ • Sub-tasks ⭐ │  │                 │  │ • Sub-tasks     │ │
│  └────────┬─────────┘  └────────┬────────┘  └────────┬─────────┘ │
│           │                     │                    │             │
└───────────┼─────────────────────┼────────────────────┼─────────────┘
            │                     │                    │
            ├─────────────────────┴────────────────────┤
            │                                          │
            ▼                                          ▼
┌──────────────────────────────────────────────────────────────────┐
│                    FRONTEND (React)                              │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  AddTaskModal.jsx                    ChatWidget.jsx             │
│  ┌──────────────────────┐           ┌──────────────────────┐   │
│  │ State:               │           │ State:               │   │
│  │ • title              │           │ • transcript         │   │
│  │ • repeat ⭐         │           │ • isListening        │   │
│  │ • subtasks ⭐       │           │ • messages           │   │
│  │ • newSubtask        │           │                      │   │
│  │                      │           │ Methods:             │   │
│  │ Methods:             │           │ • startListening()   │   │
│  │ • handleSubmit()     │           │ • stopListening()    │   │
│  │ • addSubtask() ⭐   │           │ • sendMessage()      │   │
│  │ • removeSubtask() ⭐│           │                      │   │
│  └─────────┬──────────┘           └──────────┬──────────┘   │
│            │                                  │                 │
└────────────┼──────────────────────────────────┼─────────────────┘
             │                                  │
             └──────────────┬───────────────────┘
                            │
                    axios.post() / send()
                            │
                            ▼
┌──────────────────────────────────────────────────────────────────┐
│               BACKEND APIs (Express.js)                          │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Task Routes (/api/tasks):                                      │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ POST   /                                                │  │
│  │   body: { title, due_at, priority, repeat, subtasks }  │  │
│  │   → taskController.createTask()                        │  │
│  │                                                         │  │
│  │ PATCH  /:id                                            │  │
│  │   → taskController.updateTask()                        │  │
│  │                                                         │  │
│  │ DELETE /:id                                            │  │
│  │   → taskController.deleteTask()                        │  │
│  │                                                         │  │
│  │ POST   /:taskId/subtasks ⭐                           │  │
│  │   body: { title }                                      │  │
│  │   → taskController.addSubtask()                        │  │
│  │                                                         │  │
│  │ PATCH  /:taskId/subtasks/:subtaskId ⭐               │  │
│  │   body: { status }                                     │  │
│  │   → taskController.updateSubtask()                     │  │
│  │                                                         │  │
│  │ DELETE /:taskId/subtasks/:subtaskId ⭐               │  │
│  │   → taskController.deleteSubtask()                     │  │
│  └──────────────────────────────────────────────────────────┘  │
│                           │                                      │
└───────────────────────────┼──────────────────────────────────────┘
                            │
                   services & controllers
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
┌──────────────────────────────────────────────────────────────────┐
│              Task Service Layer                                  │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  taskService:                                                   │
│  • create(taskData, userId) ⭐                                 │
│    - Accepts: repeat, subtasks                                 │
│    - Generates ObjectIds for subtasks                          │
│    - Saves to MongoDB                                          │
│                                                                  │
│  • addSubtask(taskId, userId, title) ⭐                       │
│    - Creates sub-task with ObjectId                           │
│    - Updates parent task                                       │
│    - Returns updated task                                      │
│                                                                  │
│  • updateSubtask(taskId, userId, subtaskId, updates) ⭐       │
│    - Updates status (pending/completed)                        │
│    - Returns updated task                                      │
│                                                                  │
│  • deleteSubtask(taskId, userId, subtaskId) ⭐               │
│    - Removes sub-task from array                              │
│    - Returns updated task                                      │
│                                                                  │
└──────────────┬───────────────────────────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────────────────────────┐
│             MongoDB Database                                    │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Collections.tasks:                                             │
│  {                                                              │
│    _id: ObjectId,                                               │
│    user_id: ObjectId,                                           │
│    title: String,                                               │
│    due_at: Date,                                                │
│    priority: Number,                                            │
│    status: String,                                              │
│                                                                  │
│    repeat: String ⭐ (never|daily|weekly|monthly|yearly)     │
│                                                                  │
│    recurrence: String (DAILY, EVERY_WEEK, etc.)               │
│    recurrence_pattern: String,                                  │
│    recurrence_end_date: Date,                                   │
│    next_occurrence: Date,                                       │
│                                                                  │
│    subtasks: [ ⭐                                              │
│      {                                                          │
│        _id: ObjectId,                                           │
│        title: String,                                           │
│        status: String (pending|completed),                     │
│        created_at: Date                                         │
│      }                                                          │
│    ],                                                           │
│                                                                  │
│    created_at: Date,                                            │
│    updated_at: Date                                             │
│  }                                                              │
│                                                                  │
│  Indexes:                                                       │
│  • { user_id: 1, due_at: 1 }                                  │
│  • { user_id: 1, repeat: 1 } (optional)                       │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## MCP Server Integration

```
┌─────────────────────────────────────────────────────────┐
│          MCP Server (Model Context Protocol)            │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  LLM Interface:                                         │
│  ┌─────────────────────────────────────────────────┐  │
│  │ System Prompt:                                 │  │
│  │ • Current date/time context                   │  │
│  │ • NLP extraction rules                        │  │
│  │ • Recurrence pattern detection ⭐            │  │
│  │ • Sub-task identification ⭐                 │  │
│  │ • Priority keywords                          │  │
│  └─────────────────────────────────────────────────┘  │
│                        │                               │
│                 Processes & Routes                     │
│                        │                               │
│  ┌──────────────────────┴──────────────────────────┐  │
│  │         Available Tools (toolMap)               │  │
│  │                                                  │  │
│  │  • add_task (supports repeat + subtasks) ⭐   │  │
│  │  • addSubtask() ⭐ (NEW)                      │  │
│  │  • updateSubtask() ⭐ (NEW)                   │  │
│  │  • deleteSubtask() ⭐ (NEW)                   │  │
│  │  • updateTask                                 │  │
│  │  • deleteTask                                 │  │
│  │  • getTodayTasks                              │  │
│  │  • createComplexTask                          │  │
│  │  • listEvents                                 │  │
│  │                                                  │  │
│  └──────────────────────────────────────────────────┘  │
│          │              │              │               │
│          ▼              ▼              ▼               │
│  ┌─────────────┐ ┌──────────────┐ ┌──────────────┐   │
│  │  addTask    │ │ addSubtask   │ │updateSubtask │   │
│  │   Tool      │ │   Tool       │ │    Tool      │   │
│  │   ⭐       │ │   ⭐        │ │    ⭐       │   │
│  └─────────────┘ └──────────────┘ └──────────────┘   │
│          │              │              │               │
│          └──────────────┼──────────────┘               │
│                         │                              │
│              Backend API Calls                         │
│              /api/tasks                               │
│                         │                              │
└─────────────────────────┼──────────────────────────────┘
                          │
                          ▼
                    Backend (/api/tasks)
                          │
                    Task Service
                          │
                    MongoDB
```

---

## Data Flow: Creating Task with Repeat & Sub-tasks

```
User Action: Click "Add Task" + Fill Form + Click "Create"
                        │
                        ▼
           Frontend State Update:
      {
        title: "Exercise",
        date: "2026-01-20",
        time: "07:00",
        repeat: "daily" ⭐
        subtasks: [⭐
          "Warm up",
          "Main workout",
          "Cool down"
        ]
      }
                        │
                        ▼
           handleSubmit() calls axios.post()
                        │
        POST /api/tasks (with repeat + subtasks)
                        │
                        ▼
           Backend: taskController.createTask()
                        │
                        ▼
        Validate & Log (userId check)
                        │
                        ▼
         taskService.create(taskData, userId)
                        │
                        ▼
         Generate ObjectIds for subtasks ⭐
         {
           _id: new ObjectId(),
           title: "Warm up",
           status: "pending"
         },
         ...
                        │
                        ▼
    new Task({
      user_id: userId,
      title: "Exercise",
      due_at: Date,
      priority: 3,
      repeat: "daily" ⭐
      subtasks: [...] ⭐
    }).save()
                        │
                        ▼
         MongoDB Insert
                        │
                        ▼
      Return Task Document
                        │
                        ▼
    Frontend: Update State
    • Close Modal
    • Refresh Task List
    • onTaskAdded() callback
                        │
                        ▼
      Task Appears in Dashboard
      with repeat indicator 🔁
      with sub-tasks count
```

---

## Data Flow: Voice Input with Repeat & Sub-tasks

```
User: 🎤 "Daily exercise with warmup, main workout, cool down"
                        │
                        ▼
         Web Speech API Recognition
         (continuous = true)
                        │
                        ▼
    Interim: "daily exercise with..."
    (shown in yellow box)
                        │
                        ▼
    User stops speaking / clicks red mic
                        │
                        ▼
         Final Result Text:
    "Daily exercise with warmup, main workout, cool down"
                        │
                        ▼
      axios.post('/mcp/chat', { message: ... })
                        │
                        ▼
       MCP Server receives message
                        │
                        ▼
    System Prompt Processes:
    • Extracts title: "exercise" ⭐
    • Detects repeat: "daily" ⭐
    • Finds sub-tasks: [⭐
      "warmup",
      "main workout",
      "cool down"
    ]
                        │
                        ▼
     Calls add_task tool with:
     {
       title: "exercise",
       repeat: "daily",
       subtasks: [...]
     }
                        │
                        ▼
    Backend creates task
                        │
                        ▼
    Response to Chat Widget:
    "Task created: exercise"
    "Repeats: daily"
    "3 sub-tasks added"
                        │
                        ▼
    User sees confirmation
    Task appears in dashboard
```

---

## Sub-task Management Flow

```
User Opens Task → Sees Sub-tasks List
                        │
            ┌───────────┼───────────┐
            │           │           │
            ▼           ▼           ▼
        Mark       Add New       Delete
       Complete    Sub-task      Sub-task
            │           │           │
            ▼           ▼           ▼
    PATCH sub      POST sub     DELETE sub
    status=        body: title
    completed      title: ...
            │           │           │
            └───────────┼───────────┘
                        │
                        ▼
            Backend updates subtasks array
            (MongoDB $set or $push or $pull)
                        │
                        ▼
            Returns updated task
                        │
                        ▼
            Frontend updates display
            • Sub-task shows ✓ (if completed)
            • Progress updates (2/3 done)
            • List refreshes
```

---

## Component Hierarchy

```
Dashboard (Main)
├── ChatWidget
│   ├── Messages
│   ├── Input (textarea - auto-expanding)
│   ├── Mic Button (voice)
│   └── Send Button
│
├── TaskList
│   ├── TaskItem
│   │   ├── Title
│   │   ├── Due Date
│   │   ├── Priority
│   │   ├── Repeat Indicator 🔁 ⭐
│   │   ├── SubtasksList ⭐
│   │   │   ├── SubtaskItem
│   │   │   │   ├── Checkbox
│   │   │   │   ├── Title
│   │   │   │   └── Status
│   │   │   └── + Add Sub-task ⭐
│   │   ├── Edit Button
│   │   └── Delete Button
│   └── + Add Task Button
│
└── AddTaskModal ⭐ (NEW Features)
    ├── Title Input
    ├── Date Input
    ├── Time Input
    ├── Priority Selector
    ├── Repeat Dropdown ⭐
    ├── SubtasksSection ⭐
    │   ├── Input Field
    │   ├── Add Button
    │   └── SubtasksList
    ├── Cancel Button
    └── Create Button
```

---

## State Management (AddTaskModal)

```
Component State:
┌─────────────────────────────────────────┐
│ const [title] = useState('')            │
│ const [date] = useState(...)            │
│ const [time] = useState('09:00')        │
│ const [priority] = useState(3)          │
│ const [repeat] = useState('never') ⭐  │
│ const [subtasks] = useState([]) ⭐     │
│ const [newSubtask] = useState('') ⭐   │
│ const [loading] = useState(false)       │
└─────────────────────────────────────────┘
        │
        ├─ addSubtask() ⭐
        │  Add to subtasks array
        │
        ├─ removeSubtask(index) ⭐
        │  Remove from array
        │
        └─ handleSubmit() ⭐
           Send all state to backend:
           {
             title,
             due_at,
             priority,
             repeat,
             subtasks
           }
```

---

## Database Schema (Enhanced)

```
Task Collection:
{
  _id: ObjectId,
  
  // User Reference
  user_id: ObjectId,
  
  // Basic Info
  title: String,
  description: String,
  due_at: Date,
  priority: Number (1-5),
  status: String (pending|completed),
  
  // Recurrence (existing)
  is_recurring: Boolean,
  recurrence: String,
  recurrence_pattern: String,
  recurrence_end_date: Date,
  next_occurrence: Date,
  
  // NEW: Simple Repeat ⭐
  repeat: String (enum: never|daily|weekly|monthly|yearly),
  
  // NEW: Sub-tasks Array ⭐
  subtasks: [
    {
      _id: ObjectId (unique per subtask),
      title: String,
      status: String (pending|completed),
      created_at: Date
    }
  ],
  
  // Other Fields
  is_complex: Boolean,
  duration_minutes: Number,
  tags: [String],
  
  // Timestamps
  created_at: Date,
  updated_at: Date
}
```

---

## API Response Example

### Create Task with Repeat & Sub-tasks

**Request:**
```json
POST /api/tasks
{
  "title": "Daily exercise",
  "due_at": "2026-01-20T07:00:00",
  "priority": 4,
  "repeat": "daily",
  "subtasks": [
    { "title": "Warm up" },
    { "title": "Main workout" },
    { "title": "Cool down" }
  ]
}
```

**Response (200 OK):**
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "user_id": "507f1f77bcf86cd799439001",
  "title": "Daily exercise",
  "due_at": "2026-01-20T07:00:00Z",
  "priority": 4,
  "status": "pending",
  "repeat": "daily",
  "recurrence": "NONE",
  "subtasks": [
    {
      "_id": "507f1f77bcf86cd799439012",
      "title": "Warm up",
      "status": "pending",
      "created_at": "2026-01-18T10:00:00Z"
    },
    {
      "_id": "507f1f77bcf86cd799439013",
      "title": "Main workout",
      "status": "pending",
      "created_at": "2026-01-18T10:00:00Z"
    },
    {
      "_id": "507f1f77bcf86cd799439014",
      "title": "Cool down",
      "status": "pending",
      "created_at": "2026-01-18T10:00:00Z"
    }
  ],
  "created_at": "2026-01-18T10:00:00Z",
  "updated_at": "2026-01-18T10:00:00Z"
}
```

---

## Summary: Key Architecture Points

### ⭐ New Features Added

1. **Repeat Field**
   - Simple dropdown: never|daily|weekly|monthly|yearly
   - Stored in Task document
   - Available in UI, Voice, Chat

2. **Subtasks Array**
   - Store multiple sub-tasks per task
   - Each has: _id, title, status, created_at
   - Can add/update/delete via API

3. **MCP Tools**
   - addSubtask() - Add sub-task
   - updateSubtask() - Change status
   - deleteSubtask() - Remove sub-task
   - All callable from LLM chat

4. **Frontend Components**
   - AddTaskModal: Enhanced with repeat + subtasks UI
   - ChatWidget: Supports voice with both features
   - TaskList: Shows repeat indicator + subtask count

5. **Backend Services**
   - Task service handles all CRUD
   - Sub-task methods for management
   - Database ops with proper ObjectIds

---

## File Changes Checklist ✅

**Frontend:**
- [x] AddTaskModal.jsx - Repeat + Subtasks UI

**Backend:**
- [x] task.model.js - repeat + subtasks schema
- [x] task.service.js - CRUD methods
- [x] task.controller.js - Endpoints
- [x] task.routes.js - Routes

**MCP Server:**
- [x] addTask.tool.js - Support repeat/subtasks
- [x] addSubtask.tool.js - New tool
- [x] updateSubtask.tool.js - New tool
- [x] deleteSubtask.tool.js - New tool
- [x] tools/index.js - Register tools

---

This architecture is **modular, scalable, and fully integrated** with the existing system! 🚀
