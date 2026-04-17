# 🔄 Complete Recurrence Patterns Guide

## Overview

The system now supports **19 different recurrence patterns** for tasks. You can create recurring tasks by simply mentioning the pattern in your request!

---

## All Recurrence Patterns

### 1. **DAILY** - Every Single Day
**Triggers**: "every day", "daily", "each day"

**Examples**:
```
"Take vitamins every day at 9am"
→ Creates: Daily task at 09:00

"Daily meditation routine"
→ Creates: Daily recurring task

"Drink water everyday"
→ Creates: Daily reminder
```

---

### 2. **WEEKDAYS** - Monday Through Friday
**Triggers**: "weekdays", "every weekday", "Monday to Friday", "work days"

**Examples**:
```
"Go to gym on weekdays"
→ Creates: Task Mon-Fri only

"Check emails every weekday at 9am"
→ Creates: Recurring weekday task

"Team standup weekdays at 10am"
→ Creates: Work day recurring task
```

---

### 3. **WEEKENDS** - Saturday & Sunday
**Triggers**: "weekends", "every weekend", "Saturday and Sunday"

**Examples**:
```
"Clean house every weekend"
→ Creates: Weekend recurring task

"Family dinner on weekends at 6pm"
→ Creates: Sat & Sun at 6pm

"Grocery shopping weekends"
→ Creates: Weekend recurring task
```

---

### 4-10. **Specific Days** - Every Monday, Tuesday, etc.
**Triggers**: "every Monday", "on Tuesdays", "every Friday"

**Examples**:
```
"Laundry every Monday"
→ Creates: Every Monday recurring

"Meal prep on Sundays at 10am"
→ Creates: Every Sunday at 10am

"Team meeting every Thursday"
→ Creates: Every Thursday recurring

"Pay bills every 1st and 15th"
→ Can be split into two tasks:
   - "Pay bills every 1st" 
   - "Pay bills every 15th"
```

**Individual Days**:
- EVERY_MONDAY - "every Monday"
- EVERY_TUESDAY - "every Tuesday"
- EVERY_WEDNESDAY - "every Wednesday"
- EVERY_THURSDAY - "every Thursday"
- EVERY_FRIDAY - "every Friday"
- EVERY_SATURDAY - "every Saturday"
- EVERY_SUNDAY - "every Sunday"

---

### 11. **EVERY_2_DAYS** - Every Other Day
**Triggers**: "every 2 days", "every two days", "alternate days"

**Examples**:
```
"Water plants every 2 days"
→ Creates: Every other day task

"Change bed sheets every 2 days"
→ Creates: Bi-daily recurring
```

---

### 12. **EVERY_3_DAYS** - Every Three Days
**Triggers**: "every 3 days", "every three days"

**Examples**:
```
"Deep clean every 3 days"
→ Creates: Every 3rd day task

"Change oil filter every 3 days"
→ Creates: 3-day interval recurring
```

---

### 13. **EVERY_WEEK** - Once Per Week
**Triggers**: "every week", "weekly", "once a week"

**Examples**:
```
"Meal prep weekly"
→ Creates: Weekly task

"Team review meeting every week"
→ Creates: Weekly recurring

"Call mom once a week"
→ Creates: Weekly reminder
```

---

### 14. **EVERY_2_WEEKS** - Bi-Weekly
**Triggers**: "every 2 weeks", "every other week", "twice a week"

**Examples**:
```
"Deep clean every 2 weeks"
→ Creates: Bi-weekly recurring

"Dentist appointment every 2 weeks"
→ Creates: Every 14 days task

"Paycheck every 2 weeks"
→ Creates: Bi-weekly task
```

---

### 15. **EVERY_MONTH** - Monthly
**Triggers**: "every month", "monthly", "once a month"

**Examples**:
```
"Pay rent monthly"
→ Creates: Monthly recurring

"Car maintenance every month"
→ Creates: Monthly task

"Budget review monthly"
→ Creates: Monthly reminder
```

---

### 16. **EVERY_3_MONTHS** - Quarterly
**Triggers**: "every 3 months", "quarterly"

**Examples**:
```
"Quarterly review every 3 months"
→ Creates: 3-month interval

"Dentist checkup every 3 months"
→ Creates: Quarterly task
```

---

### 17. **EVERY_6_MONTHS** - Semi-Annually
**Triggers**: "every 6 months", "semi-annually"

**Examples**:
```
"Car inspection every 6 months"
→ Creates: Semi-annual task

"Eye exam every 6 months"
→ Creates: 6-month interval
```

---

### 18. **EVERY_YEAR** - Annually
**Triggers**: "every year", "yearly", "annually", "once a year"

**Examples**:
```
"Birthday party every year"
→ Creates: Annual task

"Tax return annually"
→ Creates: Yearly reminder

"Car registration every year"
→ Creates: Annual recurring
```

---

### 19. **NONE** - No Recurrence (Default)
**Result**: One-time task

**Examples**:
```
"Buy milk tomorrow"
→ Creates: One-time task

"Call John next Monday"
→ Creates: Single occurrence
```

---

## Advanced Recurrence Features

### Stop Date (Recurrence End Date)
You can specify when a recurring task should stop repeating:

**Examples**:
```
"Take antibiotics every day until January 25"
→ Creates: Daily task, ends Jan 25

"Daily gym every weekday until end of February"
→ Creates: Weekday task, stops Feb 28

"Check progress weekly until April 1st"
→ Creates: Weekly recurring, ends Apr 1
```

**Format**: The system will extract the end date automatically!

---

## Real-World Examples

### Example 1: Daily Routine
```
Input: "Create daily 30 minute exercise every day at 7am"

Result:
✅ Title: "30 Minute Exercise"
✅ Time: 7:00 AM
✅ Recurrence: DAILY
✅ Duration: 30 minutes

Next occurrences:
- Tomorrow 7:00 AM
- Day after 7:00 AM
- And so on...
```

---

### Example 2: Work Schedule
```
Input: "Team standup every weekday at 10:30am until March 31"

Result:
✅ Title: "Team Standup"
✅ Time: 10:30 AM
✅ Recurrence: WEEKDAYS (Mon-Fri only)
✅ Ends: March 31, 2026

Next occurrences (weekdays only):
- Tomorrow (if weekday) 10:30 AM
- Next weekday 10:30 AM
- Continues until Mar 31
```

---

### Example 3: Wellness Routine
```
Input: "Yoga class every Monday and Wednesday at 6pm"

Result: Create TWO tasks
✅ Task 1: "Yoga Class" - EVERY_MONDAY at 6pm
✅ Task 2: "Yoga Class" - EVERY_WEDNESDAY at 6pm
```

---

### Example 4: Household Tasks
```
Input: "Laundry every Sunday and deep clean every 2 weeks"

Result: Create TWO tasks
✅ Task 1: "Laundry" - EVERY_SUNDAY at 9am (default)
✅ Task 2: "Deep Clean" - EVERY_2_WEEKS at 9am (default)
```

---

### Example 5: Health & Wellness
```
Input: "Take vitamin C daily until end of month"

Result:
✅ Title: "Take Vitamin C"
✅ Recurrence: DAILY
✅ Ends: January 31, 2026
✅ Will create: 14 occurrences (Jan 18-31)
```

---

## How the System Detects Recurrence

The system automatically detects recurrence patterns using keyword matching:

### Detection Algorithm
1. **Scan** the message for recurrence keywords
2. **Extract** the pattern (DAILY, WEEKLY, MONTHLY, etc.)
3. **Default** to NONE if no pattern found
4. **Parse** end date if specified (optional)

### Keyword Examples

**Daily Keywords**:
- "every day", "daily", "each day", "all days"

**Weekday Keywords**:
- "weekdays", "every weekday", "Monday to Friday", "work days"

**Weekend Keywords**:
- "weekends", "every weekend", "Saturday and Sunday"

**Weekly Keywords**:
- "every week", "weekly", "once a week"

**Monthly Keywords**:
- "every month", "monthly", "once a month"

**Interval Keywords**:
- "every 2 days", "every 3 days", "every 2 weeks"
- "every 3 months", "every 6 months", "every year"

---

## Usage Examples

### Simple Recurring Task
```
User: "Drink water every 2 hours"
System: ❌ Cannot detect recurrence (2 hours not supported)
Workaround: "Drink water every day" instead

User: "Water plants every 3 days"
System: ✅ Creates recurring task - EVERY_3_DAYS
```

### Recurring With Priority
```
User: "URGENT: Report due every Monday"
System: ✅ Creates: 
  - Title: "Report Due"
  - Priority: 1 (HIGH)
  - Recurrence: EVERY_MONDAY
```

### Recurring With Duration (Complex Task)
```
User: "Create 45 minute study session every weekday at 3pm"
System: ✅ Creates complex recurring task:
  - Title: "45 Minute Study Session"
  - Recurrence: WEEKDAYS
  - Time: 3:00 PM
  - Duration: 45 minutes
  - Description: [Multi-step breakdown]
```

### Recurring With End Date
```
User: "Team training daily from tomorrow until Friday"
System: ✅ Creates:
  - Title: "Team Training"
  - Recurrence: DAILY
  - Starts: Jan 19, 2026
  - Ends: Jan 24, 2026 (Friday)
  - Total: 6 occurrences
```

---

## Testing Your Recurrence

### Test Inputs
Try these to test your recurrence feature:

1. **Daily**: "Take medicine every day at 8am"
2. **Weekdays**: "Check emails every weekday"
3. **Weekends**: "Chores every weekend"
4. **Specific Day**: "Laundry every Sunday at 10am"
5. **Interval**: "Water plants every 3 days"
6. **Weekly**: "Team meeting every week"
7. **Monthly**: "Bill payment every month"
8. **With End Date**: "Study daily until January 25"
9. **Complex**: "Morning run every weekday (30 minutes) at 7am"
10. **High Priority**: "URGENT: Daily backup every day at 5pm"

### Expected Output
For each test, you should see in logs:
```
[addTask] Extracted recurrence pattern: DAILY
[addTask] Final task data: { title: ..., recurrence: DAILY, ... }
```

---

## Recurrence Patterns Summary Table

| Pattern | Triggers | Example |
|---------|----------|---------|
| DAILY | every day, daily | "Daily vitamins" |
| WEEKDAYS | weekdays, Monday-Friday | "Gym weekdays" |
| WEEKENDS | weekends, Sat & Sun | "Clean weekends" |
| EVERY_MONDAY-SUNDAY | every Monday, etc. | "Laundry Sundays" |
| EVERY_2_DAYS | every 2 days | "Water plants every 2 days" |
| EVERY_3_DAYS | every 3 days | "Deep clean every 3 days" |
| EVERY_WEEK | weekly, every week | "Team meeting weekly" |
| EVERY_2_WEEKS | every 2 weeks, bi-weekly | "Paycheck every 2 weeks" |
| EVERY_MONTH | monthly, every month | "Pay rent monthly" |
| EVERY_3_MONTHS | every 3 months, quarterly | "Review quarterly" |
| EVERY_6_MONTHS | every 6 months | "Eye exam every 6 months" |
| EVERY_YEAR | yearly, annually | "Birthday yearly" |
| NONE | (not mentioned) | "Buy milk tomorrow" |

---

## Tips & Best Practices

### ✅ Good Ways to Request
```
✅ "Yoga class every Monday at 6pm"
✅ "Daily standup meeting weekdays at 10am"
✅ "Monthly review on the 1st"
✅ "Water plants every 3 days"
✅ "Gym routine every weekday until March"
```

### ❌ Ways That Won't Work
```
❌ "Every 2 hours" (too frequent, not supported)
❌ "On 1st and 15th" (complex date pattern, create as two tasks)
❌ "Alternate Mondays" (not standard pattern)
❌ "Bi-annual" (not supported, use "every 6 months")
❌ "Next 10 days" (not recurrence, create individual tasks)
```

### 💡 Pro Tips
1. **Multiple Days**: Create separate tasks for each day
   - "Yoga Mon & Wed" → Two tasks (EVERY_MONDAY + EVERY_WEDNESDAY)

2. **Multiple Frequencies**: Create separate tasks
   - "Gym 3x a week" → Three specific day tasks (Mon, Wed, Fri)

3. **Specific Dates**: If you need "1st and 15th"
   - Create two tasks: One for each date with EVERY_MONTH pattern

4. **Seasonal Tasks**: Use end dates
   - "Winter tasks daily until March 1" → Daily with end date

---

## Logs to Check

When you create a recurring task, look for these logs:

**Console Output** (Terminal 2 - MCP Server):
```
[addTask] ========== NEW TASK REQUEST ==========
[addTask] Generated title: Exercise
[addTask] Extracted priority: 3
[addTask] Extracted recurrence pattern: DAILY
[addTask] Valid ISO datetime: 2026-01-19T07:00:00
[addTask] Final task data: {
  title: 'Exercise',
  due_at: '2026-01-19T07:00:00',
  priority: 3,
  recurrence: 'DAILY'
}
[addTask] Task created successfully: { _id: '...', title: 'Exercise', ... }
[addTask] ========== TASK CREATED ==========
```

---

## Database Schema

Your tasks now store recurrence information:

```javascript
{
  _id: ObjectId,
  title: "Exercise",
  due_at: Date,
  priority: 3,
  recurrence: "DAILY",                    // NEW: Pattern
  recurrence_pattern: "Every day at 7am", // NEW: Human-readable
  recurrence_end_date: Date,              // NEW: When to stop
  next_occurrence: Date,                  // NEW: Next scheduled time
  is_recurring: Boolean,
  status: "pending",
  created_at: Date,
  updated_at: Date
}
```

---

## What's Next

### Frontend Integration
The frontend should display recurring tasks with:
- 🔄 Recurrence badge (e.g., "🔄 Daily")
- 📅 Next occurrence date
- 🛑 End date if specified
- Edit/Delete/Skip options

### Backend Enhancements
Coming soon:
- Auto-generate next occurrences
- Skip single occurrences
- Bulk operations on recurring tasks
- Recurrence analytics (most recurring task type, etc.)

---

## Summary

You now have a fully featured recurrence system! 🎉

**Key Features**:
✅ 19 recurrence patterns
✅ Automatic pattern detection from keywords
✅ Optional end dates
✅ Works with priorities and complex tasks
✅ Natural language processing
✅ Comprehensive logging

**Just say what you want to repeat and the system creates it!** 🔄
