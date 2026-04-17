# 🧪 Testing Recurrence Patterns

## Before You Test

Make sure all services are running:

```bash
# Terminal 1: Backend
cd backend
npm start

# Terminal 2: MCP Server  
cd mcp-server
npm start

# Terminal 3: Frontend
cd frontend
npm run dev
```

Check that you see:
- ✅ Backend: "Server running on port 5000"
- ✅ MCP Server: "MCP Server ready"
- ✅ Frontend: "VITE v... ready in ... ms"

---

## Quick Test Suite

### Test 1: Daily Recurrence
**Input**: 
```
"Create daily exercise routine at 7am"
```

**Expected Logs** (Terminal 2):
```
[addTask] ========== NEW TASK REQUEST ==========
[addTask] Generated title: Exercise Routine
[addTask] Extracted priority: 3
[addTask] Extracted recurrence pattern: DAILY
[addTask] Valid ISO datetime: 2026-01-19T07:00:00
[addTask] Final task data: {
  title: 'Exercise Routine',
  recurrence: 'DAILY',
  ...
}
```

**Expected Result**: ✅ Task created with DAILY recurrence

---

### Test 2: Weekday Recurrence
**Input**:
```
"Gym every weekday at 6pm"
```

**Expected Logs**:
```
[addTask] Generated title: Gym
[addTask] Extracted recurrence pattern: WEEKDAYS
```

**Expected Result**: ✅ Task repeats Monday-Friday only

---

### Test 3: Weekend Recurrence
**Input**:
```
"Family dinner every weekend at 6pm"
```

**Expected Logs**:
```
[addTask] Generated title: Family Dinner
[addTask] Extracted recurrence pattern: WEEKENDS
```

**Expected Result**: ✅ Task repeats Saturday-Sunday only

---

### Test 4: Specific Day (Monday)
**Input**:
```
"Laundry every Monday at 10am"
```

**Expected Logs**:
```
[addTask] Generated title: Laundry
[addTask] Extracted recurrence pattern: EVERY_MONDAY
```

**Expected Result**: ✅ Task repeats every Monday

---

### Test 5: Bi-Daily (Every 2 Days)
**Input**:
```
"Water plants every 2 days"
```

**Expected Logs**:
```
[addTask] Generated title: Water Plants
[addTask] Extracted recurrence pattern: EVERY_2_DAYS
```

**Expected Result**: ✅ Task repeats every 2 days

---

### Test 6: Weekly Recurrence
**Input**:
```
"Team meeting every week on Monday at 10am"
```

**Expected Logs**:
```
[addTask] Generated title: Team Meeting
[addTask] Extracted recurrence pattern: EVERY_WEEK
```

**Expected Result**: ✅ Task repeats weekly

---

### Test 7: Bi-Weekly (Every 2 Weeks)
**Input**:
```
"Paycheck every 2 weeks"
```

**Expected Logs**:
```
[addTask] Generated title: Paycheck
[addTask] Extracted recurrence pattern: EVERY_2_WEEKS
```

**Expected Result**: ✅ Task repeats every 2 weeks

---

### Test 8: Monthly Recurrence
**Input**:
```
"Pay rent monthly on the 1st"
```

**Expected Logs**:
```
[addTask] Generated title: Pay Rent
[addTask] Extracted recurrence pattern: EVERY_MONTH
```

**Expected Result**: ✅ Task repeats monthly

---

### Test 9: Quarterly (Every 3 Months)
**Input**:
```
"Quarterly business review every 3 months"
```

**Expected Logs**:
```
[addTask] Generated title: Quarterly Business Review
[addTask] Extracted recurrence pattern: EVERY_3_MONTHS
```

**Expected Result**: ✅ Task repeats every 3 months

---

### Test 10: Yearly Recurrence
**Input**:
```
"Birthday party every year on January 18"
```

**Expected Logs**:
```
[addTask] Generated title: Birthday Party
[addTask] Extracted recurrence pattern: EVERY_YEAR
```

**Expected Result**: ✅ Task repeats yearly

---

### Test 11: Priority + Recurrence
**Input**:
```
"URGENT: Daily backup at 5pm"
```

**Expected Logs**:
```
[addTask] Generated title: Daily Backup
[addTask] Extracted priority: 1
[addTask] Extracted recurrence pattern: DAILY
```

**Expected Result**: ✅ HIGH priority (1) + DAILY recurrence

---

### Test 12: End Date
**Input**:
```
"Take antibiotics daily until January 25"
```

**Expected Logs**:
```
[addTask] Generated title: Take Antibiotics
[addTask] Extracted recurrence pattern: DAILY
[addTask] Final task data: {
  recurrence_end_date: '2026-01-25T00:00:00'
}
```

**Expected Result**: ✅ Task repeats DAILY until Jan 25

---

### Test 13: Complex Task with Recurrence
**Input**:
```
"Create 30 minute exercise plan every weekday at 7am"
```

**Expected Result**: 
- If LLM calls `create_complex_task`: ✅ Complex recurring task
- With duration: 30 minutes
- With recurrence: WEEKDAYS
- With steps breakdown

**Check Logs** for:
```
[createComplexTask] Received args: {
  title: ...,
  recurrence: 'WEEKDAYS',
  duration_minutes: 30,
  ...
}
```

---

### Test 14: No Recurrence (Default)
**Input**:
```
"Buy milk tomorrow at 5pm"
```

**Expected Logs**:
```
[addTask] Generated title: Buy Milk
[addTask] Final task data: {
  recurrence: 'NONE'
}
```

**Expected Result**: ✅ One-time task (no recurrence)

---

## Advanced Test Scenarios

### Scenario A: Multiple Tasks from One Request
**Input**:
```
"Yoga Monday and Wednesday at 6pm"
```

**Expected**: 
Create TWO tasks:
1. "Yoga" - EVERY_MONDAY at 6pm
2. "Yoga" - EVERY_WEDNESDAY at 6pm

**Note**: LLM should handle this intelligently

---

### Scenario B: Combining All Features
**Input**:
```
"URGENT: 45-minute morning run every weekday at 6am until March 1st"
```

**Expected**:
- Complex task: 45-minute run with warmup/cooldown steps
- Recurrence: WEEKDAYS
- Priority: 1 (HIGH)
- Starts: Tomorrow at 6:00 AM
- Ends: March 1, 2026

---

### Scenario C: Natural Language Variations
Try these different phrasings for the same meaning:

```
"Every day at 9am"
vs
"Daily at 9am"
vs  
"Each day at 9am"
vs
"All days at 9am"

All should → DAILY recurrence
```

---

## Where to Look for Results

### 1. **Terminal Logs** (Most Important)
- Terminal 2 (MCP Server): Watch for `[addTask]` and `[createComplexTask]` logs
- Shows extracted recurrence pattern in real-time

### 2. **Frontend**
- Navigate to Dashboard
- Look for recurring tasks (should have recurrence badge)
- Check tomorrow's tasks see if recurring task appears

### 3. **Database**
```bash
# Connect to MongoDB
# View task collection
db.tasks.findOne({ recurrence: "DAILY" })

# Should show:
{
  _id: ...,
  title: "Exercise",
  recurrence: "DAILY",
  recurrence_end_date: null,
  created_at: ...,
  updated_at: ...
}
```

---

## Debugging Checklist

### ❌ Recurrence not detected?

**Check 1**: Terminal logs show what was extracted
```bash
# Terminal 2 should show:
[addTask] Extracted recurrence pattern: DAILY
# If missing: "NONE" means pattern wasn't recognized
```

**Check 2**: Keywords in your input
```
✅ "every day" - detected
❌ "one day" - not detected
✅ "daily" - detected
❌ "sometimes" - not detected
```

**Check 3**: Capitalization matters
```
✅ "EVERY DAY" - detected (case insensitive)
✅ "Every day" - detected
✅ "every day" - detected
```

---

## Test Execution Steps

### Step 1: Start Services
```bash
# Run these in 3 separate terminals
cd backend && npm start
cd mcp-server && npm start
cd frontend && npm run dev
```

### Step 2: Open Dashboard
- Go to http://localhost:5173
- Log in with test account
- Open chat widget

### Step 3: Send Test Message
- Type: "Daily exercise at 7am"
- Press Send

### Step 4: Check Logs
- Look at Terminal 2 (MCP Server)
- Find `[addTask]` section
- Verify: `Extracted recurrence pattern: DAILY`

### Step 5: Verify in Frontend
- Check if task appears in list
- Look for any recurrence indicator

### Step 6: Check Database
- Verify task has `recurrence: "DAILY"` field
- Confirm other fields are correct

---

## Success Criteria

✅ **Test Passed When You See**:

1. **Console Logs** (Terminal 2):
   ```
   [addTask] Extracted recurrence pattern: DAILY
   [addTask] Task created successfully: {...}
   ```

2. **Frontend**:
   - Task appears in task list
   - Shows today's date
   - (Optional: Shows recurrence badge)

3. **Database**:
   - Task has correct `recurrence` value
   - `recurrence_end_date` matches input (if provided)

---

## Common Issues & Solutions

### Issue 1: Recurrence shows "NONE"
**Cause**: Keyword not recognized
**Solution**: Check log message - what was extracted?
```javascript
// Try these variations:
"every day" ✅
"daily" ✅
"each day" ✅
"all days" ✅
"everyDay" ❌ (no space)
```

### Issue 2: Task created but recurrence empty
**Cause**: Backend validation
**Solution**: Check backend logs
```bash
# Backend should show:
POST /tasks
Body: { recurrence: "DAILY", ... }
Response: 201 { _id: ..., recurrence: "DAILY" }
```

### Issue 3: End date not working
**Cause**: Date format issue
**Solution**: Ensure date is ISO-8601 format
```javascript
// Correct:
"2026-01-25T00:00:00"

// Incorrect:
"01/25/2026"
"Jan 25"
"next Friday"
```

### Issue 4: LLM not detecting pattern
**Cause**: System prompt might not be loaded
**Solution**: Restart MCP server
```bash
# In Terminal 2:
# Stop: Ctrl+C
# Restart: npm start
# Check: MCP Server ready message
```

---

## Performance Check

### Single Task Response Time
```
Input: "Daily exercise at 7am"
Time: Should complete in < 3 seconds
Expected Steps:
  1. Send to LLM (0.5-1 sec)
  2. LLM processes & calls tool (0.5-1 sec)
  3. Tool validates & sends to backend (0.3-0.5 sec)
  4. Backend creates & returns (0.2-0.3 sec)
  Total: ~2-3 seconds
```

### Batch Test (10 recurring tasks)
```
Expected: 20-30 seconds total
Should see 10 success messages in logs
```

---

## Advanced Testing

### Load Testing
```bash
# Create 100 recurring tasks
for i in {1..100}; do
  curl -X POST http://localhost:3001/chat \
    -H "Content-Type: application/json" \
    -d '{
      "message": "Create task #'$i' daily",
      "history": []
    }' &
done
wait
echo "Load test complete"
```

### Regression Testing
Ensure old features still work:
- ✅ Non-recurring tasks (NONE)
- ✅ Priority detection (URGENT)
- ✅ Title generation (auto-title)
- ✅ Date parsing (tomorrow, next week)
- ✅ Complex tasks (with duration & steps)

---

## Final Verification

Run this complete test:

```
1. "Daily multivitamins at 9am" 
   → DAILY at 09:00
   
2. "Gym every weekday at 6pm"
   → WEEKDAYS at 18:00
   
3. "Laundry every Sunday"
   → EVERY_SUNDAY at 09:00
   
4. "Team meeting every Monday at 10am"
   → EVERY_MONDAY at 10:00
   
5. "Water plants every 3 days"
   → EVERY_3_DAYS
   
6. "Pay rent monthly"
   → EVERY_MONTH
   
7. "URGENT: Daily backup at 5pm"
   → DAILY, Priority 1
   
8. "Antibiotics daily until Jan 25"
   → DAILY, ends 2026-01-25
   
9. "Buy milk tomorrow"
   → NONE (one-time)
   
10. "45min workout every weekday at 7am"
    → Complex task, WEEKDAYS, 45 minutes
```

**Expected**: All 10 should show correct recurrence patterns in logs

---

## Documentation Files

Check these for more info:
- [RECURRENCE_PATTERNS_GUIDE.md](RECURRENCE_PATTERNS_GUIDE.md) - Full details
- [RECURRENCE_QUICK_REFERENCE.md](RECURRENCE_QUICK_REFERENCE.md) - Quick lookup
- [ENHANCED_NLP_GUIDE.md](ENHANCED_NLP_GUIDE.md) - How NLP works

---

## Support

**If tests fail**:
1. Check all services are running
2. Review logs for error messages
3. Verify environment variables set
4. Check MongoDB is accessible
5. Restart services and retry

**Questions?**
- Check terminal error messages
- Review log output carefully
- Verify input matches expected format
- Test with simpler input first

---

Ready to test? Start with "Daily exercise at 7am" and watch the logs! 🚀
