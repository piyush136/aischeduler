# Multi-Task Creation - Quick Reference

## Feature Overview

Your AI assistant now supports creating **multiple tasks from a single prompt**. Instead of saying one task at a time, you can list several tasks and they'll all be created together.

## Examples

### Example 1: Simple List
**You say:**
```
Buy milk tomorrow at 2pm, call the dentist next Wednesday at 10am, and finish the report by Friday evening
```

**AI does:**
- Extracts 3 tasks
- Calls `add_multiple_tasks` with array of 3 items
- Creates all 3 tasks in database
- Syncs all 3 with Google Calendar

**Response:**
```
✅ 3 tasks added successfully. 3 synced with Google Calendar.
```

### Example 2: With Priorities
**You say:**
```
Urgent: Fix the critical bug today by 5pm. Normal: Review PR tomorrow at 2pm. Low priority: Update documentation this week
```

**AI does:**
- Extracts 3 tasks with different priorities
- Task 1: priority=1 (High) - Fix the critical bug
- Task 2: priority=3 (Normal) - Review PR
- Task 3: priority=5 (Low) - Update documentation

**Response:**
```
✅ 3 tasks added successfully. 2 synced with Google Calendar.
```

### Example 3: Mixed with Recurring
**You say:**
```
Set up gym routine on weekdays at 6am, call mom every Sunday at 2pm, and submit weekly report every Friday by 5pm
```

**AI does:**
- Extracts 3 recurring tasks
- Sets recurrence patterns (WEEKDAYS, EVERY_SUNDAY, EVERY_FRIDAY)
- Creates all 3 tasks

**Response:**
```
✅ 3 tasks added successfully. 3 synced with Google Calendar.
```

## What Happens Behind the Scenes

```
Your Prompt
    ↓
Gemini LLM analyzes
    ↓
Identifies multiple tasks
    ↓
Extracts: [task1, task2, task3, ...]
    ↓
Validates each task
    ↓
Calls: add_multiple_tasks with array
    ↓
Backend creates all in DB (atomic)
    ↓
Syncs each with Google Calendar
    ↓
Returns summary with success count
```

## How It Decides

| User Says | Tool Used | Result |
|-----------|-----------|--------|
| 1 task | `add_task` | ✅ 1 task added |
| 2+ tasks | `add_multiple_tasks` | ✅ N tasks added |
| Complex multi-step | `create_complex_task` | ✅ Task plan created |
| Ask to show tasks | `get_today_tasks` | 📋 Today's tasks |

## Formatting Tips

### ✅ What Works Well
```
"Buy milk tomorrow at 2pm, call dentist Wednesday at 10am, finish report Friday"
```
- Clear separation between tasks
- Natural language dates/times
- Simple descriptions

### ✅ Also Works
```
"I need to:
1. Buy groceries today at 5pm (urgent)
2. Call mom tomorrow morning
3. Finish presentation by Friday (high priority)"
```
- Numbered list format
- Priority keywords
- Line-separated tasks

### ⚠️ Be Specific
```
❌ "Buy stuff and do things tomorrow"
✅ "Buy milk and bread tomorrow at 2pm"
```
- Include specific items
- Add times when possible

```
❌ "Get things done this week"
✅ "Review budget on Tuesday, clean kitchen on Thursday, exercise on Saturday"
```
- Be specific about what and when

## Response Format

When you create multiple tasks, you'll see:

```
✅ 5 tasks added successfully. 4 synced with Google Calendar.
```

This means:
- **5 tasks** = Total created in database
- **4 synced** = Successfully synced to your Google Calendar
- **1 not synced** = Either no Google Calendar connected, or sync error (task still created locally)

## Limitations

- **Maximum 50 tasks per request** - If you try to create 51 tasks, it will be rejected
- **All tasks require**: Title and date/time
- **Google Calendar sync**: Only if you've connected your Google account
- **Date format**: Must be parseable (tomorrow, next Monday, 2026-01-20, etc.)

## Error Handling

If something goes wrong:

```
❌ "Task 2 failed: Invalid date format"
```

This means:
- Most tasks were created (partial success is OK)
- One task had an issue with its date
- Check the date format and try again

## Priority Keywords

The AI automatically detects priority from these keywords:

**High Priority (1):**
- urgent, ASAP, immediately, critical, emergency, important, high priority

**Normal Priority (3)** [default]:
- No urgency keywords

**Low Priority (5):**
- eventually, when possible, low priority, no rush, whenever

## Date/Time Examples

| You Say | System Reads |
|---------|--------------|
| "today at 2pm" | Today at 14:00 |
| "tomorrow at 9am" | Tomorrow at 09:00 |
| "next Monday at 10am" | Next Monday at 10:00 |
| "this Friday" | Friday at 09:00 (default time) |
| "2026-01-25" | That date at 00:00 |
| "next week" | 7 days from now at 09:00 |

## Recurring Tasks

The AI detects recurrence patterns:

| You Say | Result |
|---------|--------|
| "every day" | Daily recurrence |
| "weekdays" | Monday-Friday |
| "every Monday" | Every Monday |
| "every week" | Weekly recurrence |
| "every month" | Monthly recurrence |
| "every year" | Yearly recurrence |

Example:
```
"Morning exercise every weekday at 6am"
→ Title: Morning exercise
→ Recurrence: WEEKDAYS
→ Time: 6:00 AM daily
```

## Tips & Tricks

### Tip 1: Group by Time Window
```
"Morning: exercise at 6am, breakfast at 7am
Afternoon: lunch meeting at noon, gym at 5pm"
```
Clear organization helps AI parse correctly.

### Tip 2: Use Separators
```
"Task 1: Buy milk tomorrow at 2pm
Task 2: Call dentist Wednesday
Task 3: Submit report Friday"
```
Numbering makes tasks explicit.

### Tip 3: Be Consistent
```
"I need to create three tasks:
- Buy groceries (today at 5pm)
- Walk the dog (tomorrow at 7am)
- Finish report (Friday by 5pm)"
```
Dashes with consistent structure.

## Troubleshooting

### "Task failed: Title is required"
Make sure each task has a clear action/title.

### "Task failed: Invalid date format"
Use dates like: today, tomorrow, next Monday, 2026-01-20

### "Only 3 synced, but 5 created"
Google Calendar wasn't connected or had an error. Tasks are still in your calendar locally.

### "Error: Too many tasks"
Maximum is 50 tasks per request. Break into smaller batches.

## Feature Comparison

| Feature | Single Task | Multiple Tasks | Complex Task |
|---------|-------------|-----------------|--------------|
| Creation method | Natural language | List or numbered | Step-by-step |
| Auto-sync Google | ✅ Yes | ✅ Yes | ✅ Yes |
| Recurrence | ✅ Yes | ✅ Yes | ❌ No |
| Subtasks | ✅ Yes | ✅ Yes | ✅ Yes |
| Max per request | 1 | 50 | 1 |
| Best for | One action | Multiple items | Detailed plans |

## Common Scenarios

### Scenario: Weekly Routine Setup
```
"Set up my weekly routine:
- Gym: every Monday, Wednesday, Friday at 6am
- Team meeting: every Tuesday at 10am
- Client call: every Thursday at 2pm
- Project review: every Friday at 4pm"

→ Result: 4 recurring tasks created
```

### Scenario: Project Kickoff
```
"For the new website project I need to:
1. Design wireframes by Monday
2. Get design approval by Wednesday
3. Start development by Friday
4. Set up staging server by next Monday"

→ Result: 4 tasks with sequential deadlines
```

### Scenario: Daily Checklist
```
"My daily tasks:
- Morning standup at 9am
- Check emails throughout the day
- Lunch meeting at noon
- Code review at 3pm
- Team sync at 4pm"

→ Result: 5 tasks created
```

## Support

Need help? Check:
1. **Task didn't get created?** - Check if date/title is valid
2. **Google Calendar not syncing?** - Verify Google account is connected
3. **Wrong task created?** - Delete and try with clearer wording
4. **Getting errors?** - Check the error message for which field is invalid

---

**That's it!** You can now create multiple tasks with a single prompt. The AI will:
- Understand you're creating multiple tasks
- Extract each one correctly
- Create them all at once
- Sync with Google Calendar
- Show you a summary

Enjoy faster task creation! 🚀
