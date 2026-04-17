# 🎯 QUICK REFERENCE: Recurring Tasks & Sub-tasks

## 🚀 GETTING STARTED (30 seconds)

### Create Your First Recurring Task

**Via UI:**
1. Click blue "+ Add Task" button
2. Fill: Title, Date, Time, Priority
3. **NEW:** Select Repeat option (Never/Daily/Weekly/Monthly/Yearly)
4. Click "Create Task" ✓

**Via Voice:** 🎤
- "Daily exercise at 7am"
- "Weekly meeting on Friday"
- "Monthly review"

**Via Chat:** 💬
- Type: "Create daily standup at 9am"

---

## 📋 SUB-TASKS (30 seconds)

### Add Sub-tasks During Task Creation

1. Click "+ Add Task" button
2. Fill basic info (title, date, time, priority)
3. **NEW:** Scroll to "Sub-tasks" section
4. Type sub-task: "Research topic"
5. Press Enter or click "+" button
6. Add more: "Create slides", "Practice"
7. Click "Create Task" ✓

**Result:** Task with 3 sub-tasks created!

---

## 🎯 REPEAT OPTIONS

| Option | How Often | Example |
|--------|-----------|---------|
| **Never** | One time | School meeting |
| **Daily** | Every day | Exercise routine |
| **Weekly** | Once a week | Team standup |
| **Monthly** | Once a month | Bill payment |
| **Yearly** | Once a year | Birthday |

---

## 🗣️ VOICE COMMANDS

### Recurrence Keywords
```
✓ "Daily" / "Every day"
✓ "Weekly" / "Every week"
✓ "Monthly" / "Every month"
✓ "Yearly" / "Every year"
✓ "Every Monday" / "Every Friday"
✓ "Weekdays" / "Weekends"
```

### Sub-task in Voice
```
"Create workout with warmup, run, and cooldown"
"Add grocery list: milk, eggs, bread"
```

---

## 📱 MODAL LAYOUT

### Before Recurrence & Sub-tasks
```
Task Title [________]
Date [date] Time [time]
Priority [●●●○○]
[Cancel] [Create Task]
```

### After (NEW)
```
Task Title [________]
Date [date] Time [time]
Priority [●●●○○]
Repeat [Never ▼]           ← NEW

Sub-tasks:                 ← NEW
[Sub-task] [+]
✓ Sub-task 1 (Remove)
✓ Sub-task 2 (Remove)

[Cancel] [Create Task]
```

---

## 💡 COMMON USE CASES

### Daily Routine
- **Title:** "Morning routine"
- **Repeat:** Daily
- **Sub-tasks:** Brush teeth, Shower, Breakfast

### Weekly Meeting
- **Title:** "Team sync"
- **Repeat:** Weekly
- **Sub-tasks:** Review agenda, Take notes, Send follow-up

### Monthly Report
- **Title:** "Monthly report"
- **Repeat:** Monthly
- **Sub-tasks:** Collect data, Create graphs, Send email

### Yearly Event
- **Title:** "Anniversary"
- **Repeat:** Yearly
- **Sub-tasks:** Buy gift, Make reservation, Send card

---

## 🔧 SUB-TASK MANAGEMENT

### Add Sub-task Later (After Creating Task)
1. Open task in dashboard
2. Click "Add Sub-task"
3. Enter title
4. Save

### Mark Sub-task Complete
1. Click checkbox next to sub-task
2. Shows ✓ when done
3. Progress updates (e.g., 2/3 done)

### Delete Sub-task
1. Click "Remove" next to sub-task
2. Confirm
3. Sub-task deleted

### Track Progress
- View completion: 1/4, 2/4, etc.
- Dashboard shows overall status
- Easy to see remaining work

---

## 📡 API QUICK REFERENCE

### Create Task with Repeat & Sub-tasks
```bash
POST /api/tasks
{
  "title": "Exercise",
  "due_at": "2026-01-20T07:00:00",
  "repeat": "daily",
  "subtasks": [
    {"title": "Warmup"},
    {"title": "Run"}
  ]
}
```

### Add Sub-task to Existing Task
```bash
POST /api/tasks/{taskId}/subtasks
{"title": "Cool down"}
```

### Mark Sub-task Complete
```bash
PATCH /api/tasks/{taskId}/subtasks/{subtaskId}
{"status": "completed"}
```

### Delete Sub-task
```bash
DELETE /api/tasks/{taskId}/subtasks/{subtaskId}
```

---

## 🎤 VOICE EXAMPLES

### Example 1: Daily Exercise
**Say:** "Daily workout at 7am with warmup, cardio, and strength"
**Result:**
- Title: Workout
- Repeat: Daily
- 3 sub-tasks created

### Example 2: Weekly Meeting
**Say:** "Every Monday meeting at 2pm, add agenda prep and notes"
**Result:**
- Title: Meeting
- Repeat: Weekly
- 2 sub-tasks created

### Example 3: Monthly Task
**Say:** "Monthly review with budget, metrics, and planning"
**Result:**
- Title: Review
- Repeat: Monthly
- 3 sub-tasks created

---

## ⌨️ KEYBOARD SHORTCUTS

| Action | How |
|--------|-----|
| Add sub-task | Type + Press Enter |
| Remove sub-task | Click Remove button |
| Create task | Click Create or Ctrl+Enter |
| Cancel | Click Cancel or Esc |
| Voice input | Click Green Mic 🎤 |

---

## 🆘 TROUBLESHOOTING

**Q: Task won't save?**
- Make sure Title is filled in
- Check if date/time is valid
- Try again

**Q: Sub-task not appearing?**
- Press Enter after typing
- Or click "+" button
- Should appear in list

**Q: Repeat not working?**
- Select from dropdown (not free text)
- Options: Never, Daily, Weekly, Monthly, Yearly
- Voice auto-detects these words

**Q: Sub-task not deleting?**
- Click exact Remove button
- Confirm if prompted
- Try refresh if issue persists

---

## 📊 FEATURES CHECKLIST

### Recurring Tasks
- [x] Daily option
- [x] Weekly option
- [x] Monthly option
- [x] Yearly option
- [x] Voice support
- [x] Auto-detection

### Sub-tasks
- [x] Add during creation
- [x] Add after creation
- [x] Mark complete
- [x] Delete sub-task
- [x] Progress tracking
- [x] Voice support

### Integration
- [x] Voice input works
- [x] Chat commands work
- [x] Calendar syncs
- [x] Database saves
- [x] UI updates

---

## 🎯 BEST PRACTICES

### Recurrence Tips
1. **Use Daily for habits** (Exercise, meditation)
2. **Use Weekly for meetings** (Standup, sync)
3. **Use Monthly for reviews** (Reports, budgets)
4. **Use Yearly for events** (Birthdays, anniversaries)

### Sub-task Tips
1. **Break down big tasks** into small steps
2. **Keep sub-tasks focused** (one action each)
3. **Order logically** (sequence of steps)
4. **Delete when complete** (keep list clean)

### Voice Tips
1. **Speak clearly** with natural pauses
2. **Say full task** including recurrence
3. **List sub-tasks** naturally
4. **Edit if needed** before saving

---

## 📈 WORKFLOW

```
Start: "I want recurring task with sub-tasks"
         ↓
Option 1: Via UI (Modal)
  - Click Add Task
  - Fill details
  - Select repeat
  - Add sub-tasks
  - Create ✓
         ↓
Option 2: Via Voice 🎤
  - Click green mic
  - Say full task
  - System processes
  - Task created ✓
         ↓
Option 3: Via Chat 💬
  - Type command
  - Chat processes
  - Task created ✓
         ↓
View: Task appears in dashboard
  - Shows repeat indicator
  - Shows sub-task count
  - Track progress
  - Manage sub-tasks
```

---

## 🚀 3-MINUTE ONBOARDING

**Minute 1:** Understand Repeat
- Never = one-time
- Daily = every day
- Weekly = once a week
- Monthly = once a month
- Yearly = once a year

**Minute 2:** Understand Sub-tasks
- Break task into steps
- Check off as complete
- Track progress
- Organize work

**Minute 3:** Try It
1. Click Add Task
2. Title: "Learn new skill"
3. Repeat: Daily
4. Sub-task: "Study 30 minutes"
5. Sub-task: "Practice exercise"
6. Create ✓

---

## 📞 SUPPORT

### Common Questions

**Q: Can I have repeating sub-tasks?**
A: No, sub-tasks are one-time under each parent task occurrence

**Q: What if I need every 2 days?**
A: Use voice! Say "every 2 days" for advanced patterns

**Q: How many sub-tasks allowed?**
A: Unlimited! Add as many as needed

**Q: Can I edit repeat after creating?**
A: Yes! Open task and modify repeat setting

---

## ✨ PRO TIPS

1. **Habit Tracking:** Use Daily + 1 sub-task
2. **Project Management:** Use Weekly + many sub-tasks
3. **Calendar Blocking:** Set time + repeat + sub-tasks
4. **Goal Tracking:** Use relevant repeat + detailed sub-tasks
5. **Team Collaboration:** Sync shared tasks with sub-tasks

---

## 🎉 YOU'RE READY!

You now have:
✅ Recurring tasks (5 options)
✅ Sub-tasks (unlimited)
✅ Voice support
✅ Full calendar integration

**Start creating powerful tasks today!** 🚀

---

**Last Updated:** January 18, 2026
**Quick Reference Version:** 1.0
**Status:** Ready to Use
