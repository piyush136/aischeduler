# 📋 NEW FEATURES: Recurring Tasks & Sub-tasks

## Overview
Your task management system now includes two powerful features:
1. **Recurring Tasks** - Set tasks to repeat daily, weekly, monthly, or yearly
2. **Sub-tasks** - Break down tasks into smaller, manageable steps

---

## 1️⃣ RECURRING TASKS FEATURE

### What Are Recurring Tasks?
Tasks that automatically repeat on a schedule instead of being one-time events.

### How to Add a Recurring Task

#### Method 1: Using the UI Modal ✅ (Easiest)

1. **Click "Add Task"** button
2. **Fill in task details** (title, date, time, priority)
3. **Select Repeat Option:**
   - `Never` (default) - One-time task
   - `Daily` - Repeats every day
   - `Weekly` - Repeats every week
   - `Monthly` - Repeats every month
   - `Yearly` - Repeats every year
4. **(Optional) Add Sub-tasks** (see below)
5. **Click "Create Task"** ✓

#### Method 2: Using Voice 🎤

Say your task with recurrence pattern:
```
"Daily exercise at 7am"
"Meeting every Monday at 2pm"
"Check reports weekly"
"Birthday reminder every year"
```

The system automatically detects the recurrence pattern!

#### Method 3: Using Chat Widget 💬

Type in the chat:
```
"Create a daily standup at 9am"
"Add weekly team sync on Friday"
"Monthly review on the 15th"
```

The AI understands common recurrence keywords!

---

### Repeat Options

| Option | Behavior | Example |
|--------|----------|---------|
| **Never** | Task happens once | One-time meeting |
| **Daily** | Every single day | Morning exercise |
| **Weekly** | Once per week | Team standup (Monday) |
| **Monthly** | Once per month | Bill payment |
| **Yearly** | Once per year | Birthday, Anniversary |

---

### Advanced Recurrence Patterns (Via Voice/Chat)

The system supports 19 different recurrence patterns:

```
✅ DAILY                - Every single day
✅ WEEKDAYS            - Monday to Friday
✅ WEEKENDS            - Saturday & Sunday
✅ EVERY_MONDAY        - Only Mondays
✅ EVERY_TUESDAY       - Only Tuesdays
✅ EVERY_WEDNESDAY     - Only Wednesdays
✅ EVERY_THURSDAY      - Only Thursdays
✅ EVERY_FRIDAY        - Only Fridays
✅ EVERY_SATURDAY      - Only Saturdays
✅ EVERY_SUNDAY        - Only Sundays
✅ EVERY_2_DAYS        - Every 2 days
✅ EVERY_3_DAYS        - Every 3 days
✅ EVERY_WEEK          - Once a week
✅ EVERY_2_WEEKS       - Every 2 weeks
✅ EVERY_MONTH         - Once a month
✅ EVERY_3_MONTHS      - Every 3 months
✅ EVERY_6_MONTHS      - Every 6 months
✅ EVERY_YEAR          - Once a year
```

#### Keywords the System Recognizes:

**Daily:**
- "Daily", "Every day", "Each day", "All days"

**Weekdays:**
- "Weekdays", "Monday to Friday", "Work days"

**Weekends:**
- "Weekends", "Saturday and Sunday"

**Weekly:**
- "Every week", "Weekly", "Once a week"

**Monthly:**
- "Monthly", "Every month", "Once a month"

**Yearly:**
- "Yearly", "Annually", "Every year", "Once a year"

**Specific Patterns:**
- "Every Monday", "Every Tuesday", etc.
- "Every 2 days", "Every 3 days"
- "Every 2 weeks", "Twice a week"

---

## 2️⃣ SUB-TASKS FEATURE

### What Are Sub-tasks?
Smaller tasks grouped under a parent task to help you break down complex work.

### How to Add Sub-tasks

#### Method 1: During Task Creation ✅ (Via UI)

1. **Click "Add Task"** button
2. **Fill task details** (title, date, priority)
3. **Scroll to "Sub-tasks" section**
4. **Type sub-task title** in the input field
5. **Press Enter** or **click "+" button** to add
6. **Add more sub-tasks** as needed
7. **Review the list** (shows all added sub-tasks)
8. **Click "Create Task"** ✓

**Example: "Prepare presentation" task with sub-tasks:**
```
Main Task: Prepare presentation
Sub-tasks:
  ✓ Research topics
  ✓ Create slides
  ✓ Practice speaking
  ✓ Print handouts
```

#### Method 2: Adding After Creation 🔧

After creating a task, you can add sub-tasks later:

1. **Open task** in dashboard
2. **Click "Add Sub-task"** button
3. **Enter sub-task title**
4. **Press Enter** to save

#### Method 3: Using Chat Widget 💬

```
"Create task 'Plan vacation' with subtasks: book hotel, buy tickets, pack luggage"
"Add to grocery list: milk, eggs, bread"
"Create workout plan: warm-up, main exercise, cool-down"
```

---

### Managing Sub-tasks

#### View Sub-tasks
- All sub-tasks appear with the parent task
- Check box shows completion status

#### Mark Sub-task Complete
- Click on sub-task in task view
- Click "Complete" or checkbox
- Shows ✓ when completed

#### Edit Sub-task
- Click sub-task title
- Modify text
- Save changes

#### Delete Sub-task
- Click "Remove" button next to sub-task
- Confirm deletion
- Sub-task removed from list

---

### Sub-task UI Features

#### Adding Sub-tasks (During Creation)
```
┌─ New Task ──────────────────────┐
│ Task Title: [_______________]  │
│ Date: [date]  Time: [time]     │
│ Priority: [●●●○○]              │
│ Repeat: [Never ▼]              │
│                                 │
│ Sub-tasks:                      │
│ ┌─ Add Sub-task ──────────────┐│
│ │ [__________] [+]           ││
│ └─────────────────────────────┘│
│ Added: (0 sub-tasks)           │
│                                 │
│ [Cancel] [Create Task] ✓       │
└─────────────────────────────────┘
```

#### Sub-task List (While Adding)
```
Sub-tasks:
✓ Research topics (Remove)
✓ Create slides (Remove)
✓ Practice speaking (Remove)
```

#### In Task Dashboard
```
📌 Prepare Presentation
   Due: Jan 20, 2026 at 2:00 PM
   Priority: High
   Repeat: Never
   
   Sub-tasks:
   ☐ Research topics
   ☐ Create slides
   ☑ Practice speaking
   ☐ Print handouts
```

---

## 🔄 API ENDPOINTS

### Task Creation with Repeat & Sub-tasks

**Endpoint:** `POST /api/tasks`

**Request:**
```json
{
  "title": "Project Kickoff",
  "due_at": "2026-01-20T14:00:00",
  "priority": 4,
  "repeat": "weekly",
  "subtasks": [
    { "title": "Schedule meeting", "status": "pending" },
    { "title": "Prepare agenda", "status": "pending" },
    { "title": "Send invites", "status": "pending" }
  ]
}
```

**Response:**
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "title": "Project Kickoff",
  "due_at": "2026-01-20T14:00:00Z",
  "priority": 4,
  "repeat": "weekly",
  "subtasks": [
    {
      "_id": "507f1f77bcf86cd799439012",
      "title": "Schedule meeting",
      "status": "pending",
      "created_at": "2026-01-18T10:00:00Z"
    },
    ...
  ]
}
```

### Sub-task Management Endpoints

#### Add Sub-task to Existing Task
**Endpoint:** `POST /api/tasks/:taskId/subtasks`

**Request:**
```json
{
  "title": "New sub-task"
}
```

**Response:** Returns updated task with new sub-task

#### Update Sub-task Status
**Endpoint:** `PATCH /api/tasks/:taskId/subtasks/:subtaskId`

**Request:**
```json
{
  "status": "completed"
}
```

#### Delete Sub-task
**Endpoint:** `DELETE /api/tasks/:taskId/subtasks/:subtaskId`

---

## 🛠️ MCP TOOLS

### Available Tools

#### 1. `add_task`
Creates a task with optional recurrence and sub-tasks

**Example:**
```
Tool: add_task
Parameters:
  - title: "Daily standup"
  - due_at: "2026-01-20T09:00:00"
  - repeat: "daily"
  - subtasks: [
      { title: "Review priorities" },
      { title: "Share updates" }
    ]
```

#### 2. `add_subtask`
Adds a sub-task to an existing task

**Example:**
```
Tool: add_subtask
Parameters:
  - task_id: "507f1f77bcf86cd799439011"
  - title: "Review feedback"
```

#### 3. `update_subtask`
Updates a sub-task status (mark complete/pending)

**Example:**
```
Tool: update_subtask
Parameters:
  - task_id: "507f1f77bcf86cd799439011"
  - subtask_id: "507f1f77bcf86cd799439012"
  - status: "completed"
```

#### 4. `delete_subtask`
Deletes a sub-task from a task

**Example:**
```
Tool: delete_subtask
Parameters:
  - task_id: "507f1f77bcf86cd799439011"
  - subtask_id: "507f1f77bcf86cd799439012"
```

---

## 📝 DATABASE SCHEMA

### Task Model Updates

```javascript
{
  // Existing fields...
  title: String,
  due_at: Date,
  priority: Number,
  status: String,
  
  // NEW: Repeat field
  repeat: {
    type: String,
    enum: ['never', 'daily', 'weekly', 'monthly', 'yearly'],
    default: 'never'
  },
  
  // NEW: Sub-tasks array
  subtasks: [
    {
      _id: ObjectId,
      title: String,
      status: {
        type: String,
        enum: ['pending', 'completed'],
        default: 'pending'
      },
      created_at: Date
    }
  ]
}
```

---

## 🎯 USAGE EXAMPLES

### Example 1: Daily Exercise Task

**Via UI:**
1. Click "Add Task"
2. Title: "Exercise"
3. Time: "7:00 AM"
4. Repeat: "Daily"
5. Sub-tasks:
   - Warm up (5 min)
   - Main workout (30 min)
   - Cool down (5 min)
6. Click "Create Task" ✓

**Result:** Task repeats daily at 7am with 3 sub-tasks

---

### Example 2: Weekly Team Standup

**Via Voice:**
"Create a weekly standup on Monday at 10am with subtasks: update status, discuss blockers, plan next steps"

**What Happens:**
- Task created: "Standup" (Voice NLP extracts)
- Repeat: "Weekly" (Auto-detected from "weekly")
- 3 Sub-tasks added automatically

---

### Example 3: Monthly Bill Payment

**Via Chat:**
"Add monthly bill payment on the 15th at 5pm"

**Result:**
- Title: "Bill payment"
- Repeat: "Monthly"
- Date: 15th of every month
- Time: 5:00 PM

---

## ✨ KEY FEATURES

### ✅ Repeat Features
- Simple UI with 5 options (Never, Daily, Weekly, Monthly, Yearly)
- Advanced voice/chat support for 19 patterns
- Auto-detection from natural language
- Optional end date for recurring tasks
- Full sync with Google Calendar

### ✅ Sub-task Features
- Add during task creation
- Add after task creation
- Mark as completed/pending
- Delete individual sub-tasks
- Track completion progress
- Nested organization (parent-child)

### ✅ Combined Features
- Create repeating tasks WITH sub-tasks
- Sub-tasks inherit parent task properties
- Each occurrence can have individual sub-task progress
- Voice commands support both repeat + subtasks
- Chat widget supports complex task creation

---

## 📊 DASHBOARD IMPROVEMENTS

### Task List View
- Shows repeat indicator (🔁 for recurring)
- Shows sub-task count (e.g., "3/5 complete")
- Color-coded by priority
- Sorted by due date

### Task Detail View
- Display full recurrence pattern
- Show all sub-tasks with status
- Individual sub-task controls
- Edit repeat settings
- Add/remove sub-tasks

---

## 🔐 PERMISSIONS & VALIDATION

### Backend Validation
✅ Task owner verification (user_id)
✅ Valid repeat values
✅ Sub-task title required
✅ Sub-task ID validation
✅ Status enum validation

### Frontend Validation
✅ Required fields checked
✅ At least one sub-task title length > 0
✅ Date/time format validated
✅ Priority range checked

---

## 🐛 ERROR HANDLING

### Common Errors & Solutions

**"Task not found"**
- Task was deleted or you don't have access

**"Invalid repeat value"**
- Use: never, daily, weekly, monthly, yearly

**"Subtask title required"**
- Enter a title for the sub-task

**"Subtask not found"**
- Sub-task was deleted or incorrect ID

---

## 🚀 QUICK START

### Create Your First Recurring Task

1. **Open Chat Widget** 💬
2. **Say:** "Daily exercise at 7am"
3. **System Response:** Task created with daily repeat! ✓

### Create Your First Task with Sub-tasks

1. **Click Add Task** ➕
2. **Enter:** "Project Planning"
3. **Add Sub-tasks:**
   - Research competitors
   - Define requirements
   - Create timeline
4. **Click Create Task** ✓

---

## 📚 FILE CHANGES SUMMARY

### Frontend Files Modified
- `AddTaskModal.jsx` - Added repeat select + sub-task UI
- `ChatWidget.jsx` - Already supports voice input

### Backend Files Modified
- `task.model.js` - Added repeat + subtasks schema
- `task.service.js` - Added subtask CRUD methods
- `task.controller.js` - Added subtask endpoint handlers
- `task.routes.js` - Added subtask routes

### MCP Tools Created
- `addSubtask.tool.js` - Add sub-task via MCP
- `updateSubtask.tool.js` - Update sub-task status
- `deleteSubtask.tool.js` - Delete sub-task
- Updated `addTask.tool.js` - Support repeat parameter

---

## ✅ TESTING CHECKLIST

- [ ] Create task with repeat = daily
- [ ] Create task with repeat = weekly
- [ ] Add sub-tasks during creation
- [ ] View task with sub-tasks
- [ ] Mark sub-task as complete
- [ ] Delete sub-task
- [ ] Use voice to say "daily exercise"
- [ ] Chat: "Weekly meeting on Friday"
- [ ] Verify task appears in calendar
- [ ] Check database for repeat + subtasks fields

---

## 🎉 YOU'RE ALL SET!

Your scheduling system now has:
✅ Recurring tasks (daily, weekly, monthly, yearly)
✅ Sub-tasks for complex projects
✅ Voice support for both features
✅ Full backend integration
✅ Database persistence
✅ MCP tool support

**Start using these features now!** 🚀

---

**Last Updated:** January 18, 2026
**Features Added:** Recurring Tasks + Sub-tasks
**Status:** ✅ Production Ready
