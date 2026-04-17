# 🎯 Enhanced Natural Language Task Processing

## What's New

The system now intelligently processes natural language to extract task information and automatically:
- ✅ Generate descriptive titles if not mentioned
- ✅ Extract dates and times with smart parsing
- ✅ Detect priority levels from keywords
- ✅ Handle complex tasks like plans and routines
- ✅ Create detailed step-by-step breakdowns

---

## How It Works

### 1. Smart Title Generation

**User says**: "Do some exercise tomorrow"
**System extracts**: "Exercise" (automatically generated)

**User says**: "Create a 30 minute workout plan for tomorrow morning"
**System extracts**: "30 Minute Workout Plan" (auto-generated)

**User says**: "Buy milk tomorrow at 2pm"
**System extracts**: "Buy Milk" (auto-generated)

---

### 2. Intelligent Time & Date Parsing

**User says** | **Extracted Date**
---|---
"tomorrow at 7am" | 2026-01-19T07:00:00
"next Monday at 3pm" | 2026-01-27T15:00:00
"today at 9am" | 2026-01-18T09:00:00
"in 2 hours" | Current time + 2 hours
"this evening" | Today at 18:00:00
"Friday at 10:30am" | Next Friday at 10:30:00

---

### 3. Automatic Priority Detection

**Keyword** | **Priority** | **Level**
---|---|---
"ASAP", "urgent", "immediately" | 1 | HIGH
"critical", "high priority", "emergency" | 1 | HIGH
(default, no keyword) | 3 | NORMAL
"low priority", "eventually" | 5 | LOW
"when possible", "whenever" | 5 | LOW

**Examples**:
- "Urgent: Fix bug" → Priority 1 (HIGH)
- "Study math" → Priority 3 (NORMAL)
- "Organize files when possible" → Priority 5 (LOW)

---

### 4. Task Type Detection

#### Simple Tasks
**User input**: Any basic action item

Examples:
- "Buy milk tomorrow"
- "Call mom at 3pm"
- "Send email by Friday"

→ **Uses**: `add_task` tool

---

#### Complex Tasks (Plans, Routines, Schedules)

**User input**: Multi-step plans with duration

Examples:
- "Create a 30 minute exercise plan for tomorrow"
- "Make a morning routine (20 minutes)"
- "Generate a workout schedule for next week"
- "Create 45 minute study plan for math"

→ **Uses**: `create_complex_task` tool

---

## Tool Reference

### 1. `add_task` - Simple Tasks

**When to use**:
- Single action items
- Quick todos
- One-time tasks

**Example request**:
```
User: "Remind me to buy groceries tomorrow at 5pm"

Extracted:
- title: "Buy Groceries"
- due_at: "2026-01-19T17:00:00"
- priority: 3 (normal)
```

---

### 2. `create_complex_task` - Plans & Routines

**When to use**:
- Multi-step plans
- Exercise routines
- Study schedules
- Daily routines
- Meal plans
- Workout plans

**Example request**:
```
User: "Create a 30 minute exercise plan for tomorrow morning"

Extracted:
- title: "30 Minute Exercise Plan"
- description: [Step-by-step breakdown]
  Step 1: Warm-up (5 min)
  Step 2: Cardio (15 min)
  Step 3: Strength (7 min)
  Step 4: Cool-down (3 min)
- due_at: "2026-01-19T09:00:00"
- duration_minutes: 30
- priority: 3
- tags: ["exercise", "health", "routine"]
```

---

## Complex Task Examples

### Example 1: Exercise Plan

**User says**: 
> "Create a 30 minute morning exercise routine for tomorrow at 7am"

**System creates**:
```
Title: 30 Minute Morning Exercise Routine
Due: 2026-01-19T07:00:00
Duration: 30 minutes
Priority: Normal
Description:
  Step 1: Warm-up Stretches (5 minutes)
    - Neck rolls
    - Shoulder rolls
    - Touch toes
  
  Step 2: Cardio (12 minutes)
    - Jumping jacks (3 min)
    - Running in place (5 min)
    - High knees (4 min)
  
  Step 3: Strength Training (10 minutes)
    - Push-ups (3 min)
    - Squats (3 min)
    - Planks (4 min)
  
  Step 4: Cool-down (3 minutes)
    - Deep breathing
    - Gentle stretching

Tags: ["exercise", "health", "morning routine"]
```

---

### Example 2: Study Plan

**User says**:
> "Create a 45 minute study plan for programming next Wednesday at 2pm"

**System creates**:
```
Title: 45 Minute Programming Study Plan
Due: 2026-01-22T14:00:00
Duration: 45 minutes
Priority: Normal
Description:
  Step 1: Review Previous Concepts (10 minutes)
    - Check notes from last session
    - Review key terms
  
  Step 2: New Concept Learning (20 minutes)
    - Read tutorial section
    - Watch code examples
    - Take notes
  
  Step 3: Practice Coding (12 minutes)
    - Write code examples
    - Debug issues
  
  Step 4: Recap & Summary (3 minutes)
    - Summarize what learned
    - Plan next session

Tags: ["study", "programming", "learning"]
```

---

### Example 3: Meal Prep Plan

**User says**:
> "Create a meal prep plan for Sunday at 10am (2 hours)"

**System creates**:
```
Title: 2 Hour Meal Prep Plan
Due: 2026-01-26T10:00:00
Duration: 120 minutes
Priority: Normal
Description:
  Step 1: Shopping List & Prep (15 minutes)
    - Review recipes
    - Check what's available
    - Prep ingredients
  
  Step 2: Cook Main Dishes (45 minutes)
    - Prepare proteins
    - Cook grains
    - Roast vegetables
  
  Step 3: Prepare Containers (30 minutes)
    - Portion out servings
    - Label containers
    - Refrigerate
  
  Step 4: Cleanup (30 minutes)
    - Clean dishes
    - Wipe counters
    - Store leftovers

Tags: ["meal prep", "cooking", "health"]
```

---

## How to Use

### Simple Task
```
User: "Buy milk tomorrow at 5pm"
System: ✅ Creates simple task
```

### Complex Task
```
User: "Create a 30 minute workout for tomorrow morning"
System: ✅ Creates detailed plan with steps
```

### With Priority
```
User: "URGENT: Fix critical bug by tomorrow noon"
System: ✅ Creates high-priority task
```

### Recurring Task
```
User: "Create a daily 20 minute morning meditation routine starting tomorrow"
System: ✅ Creates recurring complex task
```

---

## Automatic Features

### Title Generation Algorithm
1. Remove common phrases ("add", "create", "remind me", "do", etc.)
2. Remove temporal words ("tomorrow", "today", "next", etc.)
3. Take first 3-5 meaningful words
4. Capitalize properly
5. Result: Clean, descriptive title

**Examples**:
- Input: "Create a task to go shopping tomorrow"
  → Generated: "Go Shopping"

- Input: "Add a reminder to call mom next week"
  → Generated: "Call Mom"

- Input: "Make a 45 minute yoga session for Friday morning"
  → Generated: "45 Minute Yoga Session"

---

### Priority Detection Algorithm
1. Check for high priority keywords (URGENT, ASAP, etc.)
2. Check for low priority keywords (eventually, whenever)
3. Default to NORMAL (3)

**Examples**:
- "ASAP buy tickets" → Priority 1 (HIGH)
- "Buy tickets" → Priority 3 (NORMAL)
- "Buy tickets when you can" → Priority 5 (LOW)

---

### Date/Time Extraction
1. Parse relative dates (tomorrow, next Monday, etc.)
2. Calculate exact date based on current date
3. Extract time (default 09:00 if not specified)
4. Format as ISO-8601 (YYYY-MM-DDTHH:mm:ss)

**Examples**:
- "tomorrow at 7am" → 2026-01-19T07:00:00
- "next Monday" → 2026-01-27T09:00:00 (default 9am)
- "today at 3:30pm" → 2026-01-18T15:30:00

---

## Parameters Explained

### For Simple Tasks

| Parameter | Example | Notes |
|-----------|---------|-------|
| **title** | "Buy Groceries" | Auto-generated if not clear |
| **due_at** | "2026-01-19T17:00:00" | ISO-8601 format required |
| **priority** | 3 | 1=high, 3=normal, 5=low |
| **description** | (optional) | Extra details |
| **recurrence** | "DAILY" | DAILY, WEEKLY, MONTHLY, or none |

### For Complex Tasks

| Parameter | Example | Notes |
|-----------|---------|-------|
| **title** | "30 Min Exercise Plan" | Auto-generated if needed |
| **due_at** | "2026-01-19T07:00:00" | When to start |
| **priority** | 3 | 1=high, 3=normal, 5=low |
| **description** | "Step 1: Warm-up..." | Detailed breakdown |
| **duration_minutes** | 30 | Total time needed |
| **recurrence** | "DAILY" | How often it repeats |
| **tags** | ["exercise", "health"] | Categories |

---

## System Prompt Instructions

The LLM (Gemini) now receives these instructions:

1. **Extract or create clear titles** (2-5 words max)
2. **Parse all temporal references** to exact ISO-8601 dates
3. **Detect priority levels** from keywords (URGENT→1, LOW→5)
4. **Choose correct tool**:
   - Simple tasks → `add_task`
   - Plans/routines → `create_complex_task`
5. **Ensure all parameters are properly formatted**

---

## Testing Examples

### Test 1: Simple Task with Auto-Generated Title
```
Input: "buy milk tomorrow"
Output:
  ✅ Title: "Buy Milk"
  ✅ Date: 2026-01-19T09:00:00
  ✅ Priority: 3 (normal)
  ✅ Tool: add_task
```

### Test 2: Complex Task with Steps
```
Input: "create a 45 minute study plan for Friday"
Output:
  ✅ Title: "45 Minute Study Plan"
  ✅ Date: 2026-01-24T09:00:00
  ✅ Duration: 45 minutes
  ✅ Description: [Multi-step breakdown]
  ✅ Tool: create_complex_task
```

### Test 3: High Priority Task
```
Input: "URGENT fix the bug ASAP"
Output:
  ✅ Title: "Fix The Bug"
  ✅ Priority: 1 (HIGH)
  ✅ Tool: add_task
```

### Test 4: Recurring Complex Task
```
Input: "create daily 20 minute morning routine starting tomorrow"
Output:
  ✅ Title: "20 Minute Morning Routine"
  ✅ Recurrence: DAILY
  ✅ Duration: 20 minutes
  ✅ Tool: create_complex_task
```

---

## How to Test This

### Start All Services
```bash
Terminal 1: cd backend && npm start
Terminal 2: cd mcp-server && npm start
Terminal 3: cd frontend && npm run dev
```

### Try These Requests

1. **Simple task**: "Buy milk tomorrow at 5pm"
2. **Complex task**: "Create a 30 minute exercise plan for tomorrow morning"
3. **Urgent task**: "URGENT: Call client by noon tomorrow"
4. **Recurring**: "Create daily 10 minute meditation starting tomorrow"
5. **Plan**: "Generate a 2-hour meal prep plan for Sunday at 10am"

### Check Logs

**MCP Server logs** should show:
```
[addTask] ========== NEW TASK REQUEST ==========
[addTask] Generated title: Buy Milk
[addTask] Extracted priority: 3
[addTask] Valid ISO datetime: 2026-01-19T17:00:00
[addTask] ========== TASK CREATED ==========
```

**Or for complex tasks**:
```
[createComplexTask] Received args: { ... }
[createComplexTask] Task created successfully: ...
Created complex task: 30 Minute Exercise Plan (30 minutes)
```

---

## Advanced Features

### Multi-Language Support
The system can understand various phrasings:
- "Add a task to..." → Creates task
- "Remind me to..." → Creates task with reminder
- "Create a plan for..." → Creates complex task
- "Schedule..." → Creates task with time
- "Make sure to..." → Creates task

### Keyword Recognition

**Date keywords**:
- Tomorrow, today, tonight, morning, afternoon, evening
- Next Monday, last Friday, this weekend
- In 2 hours, tomorrow at 3pm

**Priority keywords**:
- URGENT, ASAP, CRITICAL, IMMEDIATE, HIGH PRIORITY
- LOW PRIORITY, EVENTUALLY, WHENEVER

**Task type keywords**:
- Plan, routine, schedule, sequence, list, checklist
- Workout, exercise, study, meal prep, meditation
- Tutorial, guide, walkthrough, steps

---

## Error Handling

If the system doesn't understand something:

```
Input: "blah blah at pizza time"
Output: ❌ Invalid date format
Suggestion: Try "tomorrow at 3pm" or "Friday at 10am"

Input: "Create task"
Output: ❌ Missing title information
Suggestion: Be more specific, e.g., "Create task to buy milk"
```

---

## Summary

The enhanced system now:
✅ Extracts structured data from natural language
✅ Auto-generates descriptive titles
✅ Intelligently detects priority levels
✅ Accurately parses complex dates
✅ Handles both simple tasks and detailed plans
✅ Logs all extraction steps for transparency
✅ Provides helpful error messages

**Result**: Just say what you want to do, and the system creates the perfect task! 🎯
