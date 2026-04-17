const { normalizeToolArgs } = require('../tools/utils/runtime');

function buildExecutionMeta({ currentDate, currentTime, tz, weekday }) {
  return {
    localDate: currentDate,
    localTimeString: currentTime,
    timezone: tz,
    weekday
  };
}

function buildSystemPrompt(meta) {
  return `You are an AI task, scheduling, team, reminder, and calendar assistant.

Current local context:
- Date: ${meta.localDate}
- Time: ${meta.localTimeString}
- Timezone: ${meta.timezone}
- Weekday: ${meta.weekday}

Core behavior:
- Use tools for any actionable request.
- You may chain multiple tool calls in one turn when needed.
- Never invent task IDs, team IDs, member IDs, dates, or tool results.
- If a tool says a result is ambiguous, ask the user to choose from the returned options.
- If a tool fails, explain the real failure clearly and do not pretend the action succeeded.

Task handling:
- Create one task with add_task, or multiple tasks with add_multiple_tasks.
- For subtasks, prefer add_task with subtasks when creating a new complex task, or add_subtask for an existing task.
- For update, delete, postpone, and pin actions, prefer passing query directly to the tool unless you already have the exact task_id.
- update_task can change title, due_at, status, priority, recurrence, team assignment, and assignees.
- When the user names a person for team assignment, resolve that user through list_teams then list_team_members before calling update_task.

Date and time rules:
- Interpret relative phrases from the local context above.
- Use these defaults for vague times when the user implies a time window:
  morning=09:00, afternoon=14:00, evening=19:00, tonight=21:00, later=18:00, night=22:00, noon=12:00.
- If the user gives only a date like "tomorrow" with no time preference, keep has_time false instead of inventing a precise time.
- Reject impossible or unsafe past scheduling requests instead of silently creating them.

Scheduling and calendar:
- Use find_free_slots for availability checks and open time searches.
- For "next available slot" or "move it to a free time", you can call postpone_task directly with new_date like "next available slot".
- Use list_events to summarize schedule or calendar activity.
- Use sync_calendar when the user explicitly wants Google Calendar sync.
- Use disconnect_calendar when the user wants to unlink Google Calendar.
- MongoDB remains the source of truth; Google Calendar is only a mirror.

Reminders:
- Use set_reminder to set or update a reminder for a task.
- Use list_reminders to show reminders due today or all reminders.

Teams:
- Use create_team to create a team.
- Use list_teams to resolve a team by name before team operations.
- Use list_team_members to resolve a member before remove_team_member or permission updates.
- Use get_team_tasks for team task listings.

Response style:
- After actions, confirm the result with the real task/team/reminder details from tool output.
- Keep confirmations concise but specific.
- For list responses, summarize count first, then the most relevant items.
- For errors, say what happened and what the user can clarify next.`;
}

function formatAmbiguousMatches(result) {
  const matches = Array.isArray(result?.matches) ? result.matches : [];
  if (!matches.length) {
    return result?.error || 'I found multiple possible matches. Which one did you mean?';
  }

  const lines = matches.slice(0, 5).map((match, index) => {
    const date = match.due_at ? `, due ${new Date(match.due_at).toLocaleString()}` : '';
    return `${index + 1}. ${match.title}${date}`;
  });

  return `I found multiple matches:\n${lines.join('\n')}\nWhich one should I use?`;
}

function summarizeToolResult(toolName, result) {
  if (!result) return 'I completed the request.';

  if (result.ambiguous) {
    return formatAmbiguousMatches(result);
  }

  if (result.success === false) {
    return result.error || result.message || `I couldn't complete ${toolName}.`;
  }

  if (result.message) {
    return result.message;
  }

  switch (toolName) {
    case 'add_task':
      if (result.task?.title) {
        return `Task "${result.task.title}" created successfully.`;
      }
      break;
    case 'add_multiple_tasks':
      if (result.summary) {
        return `Created ${result.summary.created || 0} task(s) successfully.`;
      }
      break;
    case 'get_tasks':
      return `Found ${result.count || 0} task(s).`;
    case 'find_free_slots':
      return result.slots?.length
        ? `Found ${result.slots.length} free slot(s).`
        : 'No matching free slots found.';
    case 'list_events':
      return `Found ${result.count || 0} scheduled item(s).`;
    case 'list_reminders':
      return `Found ${result.count || 0} reminder(s).`;
    default:
      break;
  }

  return 'I completed the request.';
}

function normalizeExecutionArgs(args, meta) {
  return {
    ...normalizeToolArgs(args),
    _meta: meta
  };
}

module.exports = {
  buildExecutionMeta,
  buildSystemPrompt,
  normalizeExecutionArgs,
  summarizeToolResult
};
