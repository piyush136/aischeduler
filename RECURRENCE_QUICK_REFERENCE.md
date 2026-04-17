# 🔄 Recurrence Quick Reference

## One-Line Examples

| What You Want | What To Say | Result |
|---|---|---|
| Task every day | "Read book every day" | ✅ Daily |
| Task on weekdays | "Gym weekdays" | ✅ Mon-Fri |
| Task on weekends | "Clean weekends" | ✅ Sat-Sun |
| Task every Monday | "Laundry every Monday" | ✅ Every Monday |
| Task every Tuesday | "Meeting every Tuesday" | ✅ Every Tuesday |
| Task every Wednesday | "Yoga every Wednesday" | ✅ Every Wednesday |
| Task every Thursday | "Review every Thursday" | ✅ Every Thursday |
| Task every Friday | "Team lunch every Friday" | ✅ Every Friday |
| Task every Saturday | "Grocery every Saturday" | ✅ Every Saturday |
| Task every Sunday | "Meal prep every Sunday" | ✅ Every Sunday |
| Task every 2 days | "Water plants every 2 days" | ✅ Every 2 Days |
| Task every 3 days | "Deep clean every 3 days" | ✅ Every 3 Days |
| Task every week | "Team meeting weekly" | ✅ Weekly |
| Task every 2 weeks | "Paycheck every 2 weeks" | ✅ Bi-weekly |
| Task every month | "Bill payment monthly" | ✅ Monthly |
| Task every 3 months | "Review quarterly" | ✅ Every 3 Months |
| Task every 6 months | "Eye exam every 6 months" | ✅ Every 6 Months |
| Task every year | "Birthday yearly" | ✅ Yearly |
| Task once (no repeat) | "Buy milk tomorrow" | ✅ One-time |

---

## With Times

```
"Daily exercise at 7am"
→ Every day at 7:00 AM

"Weekday standup at 10am"
→ Mon-Fri at 10:00 AM

"Weekly meeting every Monday at 2pm"
→ Every Monday at 2:00 PM

"Gym routine every other day at 6pm"
→ Every 2 days at 6:00 PM
```

---

## With End Dates

```
"Daily antibiotics until January 25"
→ Daily, ends Jan 25

"Weekday training until March"
→ Weekdays, ends Mar 31

"Meditation daily for a month"
→ Daily until one month from now

"Winter workout until April 1st"
→ As specified, ends Apr 1
```

---

## With Priorities

```
"URGENT: Daily backup at 5pm"
→ Daily at 5pm, HIGH priority

"Critical: Weekly security check Monday"
→ Every Monday, HIGH priority

"Low priority: Organize files every month"
→ Monthly, LOW priority
```

---

## Combination Examples

```
"URGENT: Daily 30-minute exercise at 7am until Feb 28"
→ Daily exercise (30 min), 7am, HIGH priority, ends Feb 28

"Yoga class every Monday and Wednesday at 6pm"
→ Two tasks: EVERY_MONDAY + EVERY_WEDNESDAY at 6pm

"Weekday standup (15 min) at 10am"
→ Weekdays at 10am, complex task with duration

"Weekly team review every Friday at 3pm until end of year"
→ Every Friday at 3pm, HIGH priority (implied: until Dec 31)
```

---

## Copy-Paste Ready

### Health & Wellness
```
"Take vitamins every day at 9am"
"Workout every weekday at 6pm"
"Yoga class every Monday and Wednesday at 7pm"
"Meditation daily for 10 minutes"
"Walk every other day"
"Eye exam every 6 months"
"Dentist checkup every 3 months"
```

### Work & Productivity
```
"Team standup every weekday at 10am"
"Weekly review every Friday at 5pm"
"Check emails every weekday at 9am"
"Project update every Monday"
"Code review every Wednesday"
"Team lunch every Friday"
"Monthly report due on the 1st"
```

### Household
```
"Laundry every Sunday"
"Grocery shopping every Saturday"
"Deep clean every 2 weeks"
"Vacuum every 3 days"
"Change bed sheets weekly"
"Yard work every other Saturday"
```

### Finance
```
"Pay rent monthly"
"Check budget weekly on Sundays"
"Review accounts monthly on 1st"
"Tax preparation annually in January"
"Paycheck every 2 weeks"
"Bill payment monthly on 15th"
```

---

## Error Handling

### ❌ Not Supported → ✅ Workaround
```
❌ "Every 2 hours" 
→ ✅ Use "Every day" instead

❌ "On the 1st and 15th"
→ ✅ Create two separate tasks:
    "Task on 1st" (EVERY_MONTH)
    "Task on 15th" (EVERY_MONTH)

❌ "Alternate Mondays"
→ ✅ Use "Every 2 weeks on Monday" instead

❌ "Next 10 days"
→ ✅ Create individual tasks or use DAILY with end date

❌ "Sometimes"
→ ✅ Pick a specific frequency or create single task
```

---

## Cheat Sheet

**Most Used**:
- `every day` → DAILY
- `weekdays` → WEEKDAYS
- `weekends` → WEEKENDS
- `every week` → EVERY_WEEK
- `every month` → EVERY_MONTH
- `every year` → EVERY_YEAR

**Specific Days**:
- `every Monday` → EVERY_MONDAY
- `every Tuesday` → EVERY_TUESDAY
- ... up to Sunday

**Intervals**:
- `every 2 days` → EVERY_2_DAYS
- `every 3 days` → EVERY_3_DAYS
- `every 2 weeks` → EVERY_2_WEEKS

**Less Common**:
- `quarterly` → EVERY_3_MONTHS
- `semi-annually` → EVERY_6_MONTHS
- `annually` → EVERY_YEAR

**Stop Repeating**:
- Add any date: "...until January 25"
- Or: "...through February 14"
- Or: "...by March 1st"

---

## Test These Now

1. "Daily exercise at 7am"
2. "Gym every weekday"
3. "Laundry every Sunday"
4. "Team meeting weekly"
5. "Paycheck every 2 weeks"
6. "Deep clean every 3 days"
7. "Birthday reminder every year"
8. "Meditation daily until February"

Watch the terminal logs for:
```
[addTask] Extracted recurrence pattern: DAILY
```

---

## Pro Tips 🚀

1. **Always include time** for better clarity
   - "Exercise at 7am" vs "Exercise" (no time)

2. **Use natural language** 
   - The system understands variations!
   - "daily" = "every day" = "each day"

3. **Complex tasks** support recurrence too
   - "30-minute exercise every weekday"
   - Creates a recurring plan with steps!

4. **Combine with priority**
   - "URGENT: Call mom every Sunday"
   - Creates recurring HIGH priority task

5. **Set end dates** for temporary recurring tasks
   - "Antibiotics every day until January 25"
   - Won't repeat after Jan 25

---

## Need Help?

**Check These Files**:
- [RECURRENCE_PATTERNS_GUIDE.md](RECURRENCE_PATTERNS_GUIDE.md) - Full details
- [ENHANCED_NLP_GUIDE.md](ENHANCED_NLP_GUIDE.md) - Title generation, priority
- [Backend logs](../backend) - Detailed task creation logs
- [MCP logs](../mcp-server) - Recurrence extraction logs

**Common Questions**:
- Q: "Can I do the 1st and 15th?"
  A: Create two separate tasks, one for each date

- Q: "Does it support hourly tasks?"
  A: Not yet - minimum is "every day"

- Q: "Can I skip a specific occurrence?"
  A: Will be added soon - for now, delete and recreate

- Q: "How long does it repeat?"
  A: Forever (unless you set end_date)

---

Last Updated: January 18, 2026
System Version: 2.1 (With Recurrence Patterns)
