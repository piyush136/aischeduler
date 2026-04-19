const taskService = require('../services/task.service');
const User = require('../models/user.model');
const Task = require('../models/task.model');
const TeamMember = require('../models/teamMember.model');
const calendarService = require('../services/calendar.service');
const notificationService = require('../services/notification.service');
const reminderService = require('../services/reminder.service');
const { getTaskDurationMinutes, getTaskEnd, hasCalendarRelevantChanges, normalizeDate } = require('../utils/taskDate');

async function notifyAssignees(task, assignedTo, actingUserId) {
  const assigneeIds = Array.isArray(assignedTo) ? assignedTo : (assignedTo ? [assignedTo] : []);
  if (assigneeIds.length === 0) return;

  const creator = await User.findById(actingUserId);
  await Promise.all(assigneeIds
    .filter(assigneeId => String(assigneeId) !== String(actingUserId))
    .map(assigneeId => notificationService.create({
      user_id: assigneeId,
      type: 'task_assigned',
      task_id: task._id,
      team_id: task.team_id || null,
      message: `${creator?.name || 'Someone'} assigned you "${task.title}"`
    }).catch(error => {
      console.error('[TaskController] Failed to create assignment notification:', error.message);
    })));
}

async function syncTaskToGoogleCalendar(userId, task) {
  if (!task?.due_at) return { synced: false };

  const user = await User.findById(userId);
  if (!user?.google_tokens) return { synced: false };

  const event = await calendarService.createTaskEvent(user.google_tokens, task);
  if (event?.id && event.id !== task.googleEventId) {
    await taskService.update(task._id, userId, { googleEventId: event.id });
    task.googleEventId = event.id;
  }

  return { synced: Boolean(event?.id), eventId: event?.id || null };
}

async function deleteTaskFromGoogleCalendar(userId, task) {
  if (!task?.googleEventId) return;

  const user = await User.findById(userId);
  if (!user?.google_tokens) return;

  try {
    await calendarService.deleteEvent(user.google_tokens, 'primary', task.googleEventId);
  } catch (error) {
    console.error('[TaskController] Failed to delete Google Calendar event:', error.message);
  }
}

exports.createTask = async (req, res) => {
  try {
    const userId = req.user.id;
    const dueAt = req.body.due_at ? normalizeDate(req.body.due_at) : null;
    if (req.body.due_at && !dueAt) {
      return res.status(400).json({ error: 'Invalid due_at value' });
    }

    if (dueAt && dueAt.getTime() < Date.now()) {
      return res.status(400).json({ error: 'Tasks cannot be scheduled in the past' });
    }

    const task = await taskService.create(req.body, userId);
    await notifyAssignees(task, req.body.assigned_to, userId);

    try {
      await syncTaskToGoogleCalendar(userId, task);
    } catch (error) {
      console.error('[TaskController] Google sync failed during create:', error.message);
    }

    res.status(201).json(task);
  } catch (error) {
    console.error('[TaskController] Create task error:', error);
    res.status(500).json({ error: 'Failed to create task', details: error.message });
  }
};

exports.getAllTasks = async (req, res) => {
  try {
    const userId = req.user.id;
    const localTasks = await taskService.getAll(userId);
    res.json(localTasks);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
};

exports.getTodayTasks = async (req, res) => {
  try {
    const userId = req.user.id;
    const localTasks = await taskService.getToday(userId);
    res.json(localTasks);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch today tasks' });
  }
};

exports.updateTask = async (req, res) => {
  try {
    const userId = req.user.id;
    const existingTask = await taskService.getById(req.params.id, userId);
    if (!existingTask) {
      return res.status(404).json({ error: 'Task not found' });
    }

    if (req.body.due_at) {
      const dueAt = normalizeDate(req.body.due_at);
      if (!dueAt) {
        return res.status(400).json({ error: 'Invalid due_at value' });
      }
      if (dueAt.getTime() < Date.now()) {
        return res.status(400).json({ error: 'Tasks cannot be scheduled in the past' });
      }
    }

    const updatedTask = await taskService.update(req.params.id, userId, req.body);
    if (!updatedTask) {
      return res.status(404).json({ error: 'Task not found' });
    }

    if (Array.isArray(req.body.assigned_to)) {
      await notifyAssignees(updatedTask, req.body.assigned_to, userId);
    }

    await reminderService.syncForTask(updatedTask).catch(error => {
      console.error('[TaskController] Reminder sync failed after update:', error.message);
    });

    if (hasCalendarRelevantChanges(existingTask, updatedTask)) {
      await syncTaskToGoogleCalendar(userId, updatedTask).catch(error => {
        console.error('[TaskController] Google sync failed during update:', error.message);
      });
    }

    res.json(updatedTask);
  } catch (error) {
    console.error('[TaskController] Update task error:', error);
    res.status(500).json({ error: 'Failed to update task', details: error.message });
  }
};

exports.deleteTask = async (req, res) => {
  try {
    const userId = req.user.id;
    const deletedTask = await taskService.delete(req.params.id, userId);
    if (!deletedTask) {
      return res.status(404).json({ error: 'Task not found' });
    }

    await Promise.all([
      reminderService.deleteByTask(deletedTask._id),
      deleteTaskFromGoogleCalendar(userId, deletedTask)
    ]);

    res.json({ message: 'Task deleted' });
  } catch (error) {
    console.error('[TaskController] Delete task error:', error);
    res.status(500).json({ error: 'Failed to delete task' });
  }
};

exports.createBulkTasks = async (req, res) => {
  try {
    const userId = req.user.id;
    const { tasks } = req.body;

    if (!Array.isArray(tasks) || tasks.length === 0) {
      return res.status(400).json({ error: 'Invalid input', details: 'tasks must be a non-empty array' });
    }

    if (tasks.length > 100) {
      return res.status(400).json({ error: 'Too many tasks', details: 'Maximum 100 tasks per request' });
    }

    const results = await taskService.createBulk(tasks, userId);
    let syncedCount = 0;
    const syncErrors = [];

    for (const task of results.created) {
      try {
        const syncResult = await syncTaskToGoogleCalendar(userId, task);
        if (syncResult.synced) syncedCount += 1;
      } catch (error) {
        syncErrors.push({ taskId: task._id, error: error.message });
      }
    }

    res.status(201).json({
      success: true,
      summary: {
        totalRequested: results.total,
        created: results.created.length,
        failed: results.failed.length,
        synced: syncedCount
      },
      tasks: results.created,
      errors: results.failed.length > 0 ? results.failed : undefined,
      syncErrors: syncErrors.length > 0 ? syncErrors : undefined
    });
  } catch (error) {
    console.error('[TaskController] Bulk creation error:', error);
    res.status(500).json({ error: 'Failed to create bulk tasks', details: error.message });
  }
};

exports.addSubtask = async (req, res) => {
  try {
    const userId = req.user.id;
    const { title } = req.body;
    if (!title) return res.status(400).json({ error: 'Subtask title required' });

    const task = await taskService.addSubtask(req.params.taskId, userId, title);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    res.status(201).json(task);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add subtask' });
  }
};

exports.updateSubtask = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status } = req.body;
    if (!status) return res.status(400).json({ error: 'Status required' });

    const task = await taskService.updateSubtask(req.params.taskId, userId, req.params.subtaskId, { status });
    if (!task) return res.status(404).json({ error: 'Task or subtask not found' });
    res.json(task);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update subtask' });
  }
};

exports.deleteSubtask = async (req, res) => {
  try {
    const userId = req.user.id;
    const task = await taskService.deleteSubtask(req.params.taskId, userId, req.params.subtaskId);
    if (!task) return res.status(404).json({ error: 'Task or subtask not found' });
    res.json(task);
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete subtask' });
  }
};

exports.addComment = async (req, res) => {
  try {
    const userId = req.user.id;
    const { body } = req.body;

    const trimmedBody = String(body || '').trim();
    if (!trimmedBody) {
      return res.status(400).json({ error: 'Comment is required' });
    }
    if (trimmedBody.length > 2000) {
      return res.status(400).json({ error: 'Comment is too long' });
    }

    const task = await taskService.addComment(req.params.taskId, userId, trimmedBody);
    if (!task) {
      return res.status(404).json({ error: 'Task not found or not accessible' });
    }

    const commenter = await User.findById(userId);
    let recipients = Array.isArray(task.assigned_to)
      ? task.assigned_to.map(assignee => assignee._id || assignee)
      : [];
    if (recipients.length === 0 && task.team_id) {
      const teamMembers = await TeamMember.find({ team_id: task.team_id, status: 'active' }).select('user_id').lean();
      recipients = teamMembers.map(member => member.user_id);
    }
    if (recipients.length === 0) {
      recipients = [task.created_by?._id || task.created_by, task.user_id?._id || task.user_id].filter(Boolean);
    }

    const uniqueRecipients = [...new Set(recipients.map(id => String(id)))]
      .filter(id => id !== String(userId));

    await Promise.all(uniqueRecipients.map(recipientId => notificationService.create({
      user_id: recipientId,
      type: 'comment',
      task_id: task._id,
      team_id: task.team_id || null,
      message: `${commenter?.name || 'Someone'} commented on "${task.title}": "${trimmedBody.length > 80 ? `${trimmedBody.slice(0, 77)}...` : trimmedBody}"`
    }).catch(error => {
      console.error('[TaskController] Failed to create comment notification:', error.message);
    })));

    res.status(201).json(task);
  } catch (error) {
    console.error('[TaskController] Add comment error:', error);
    res.status(500).json({ error: 'Failed to add comment' });
  }
};

exports.checkConflict = async (req, res) => {
  try {
    const userId = req.user.id;
    const { startTime, duration = 60 } = req.query;
    if (!startTime) return res.status(400).json({ error: 'startTime is required' });

    const conflictTask = await taskService.checkConflict(userId, startTime, Number(duration));
    if (conflictTask) {
      return res.json({
        conflict: true,
        type: 'task',
        message: `Conflict: "${conflictTask.title}" is already scheduled around this time.`
      });
    }

    const user = await User.findById(userId);
    if (user?.google_tokens) {
      const start = new Date(startTime);
      const end = new Date(start);
      end.setMinutes(end.getMinutes() + Number(duration));

      const events = await calendarService.listEvents(user.google_tokens, start, end);
      if (events.length > 0) {
        return res.json({
          conflict: true,
          type: 'calendar',
          message: `Conflict: Google Calendar has "${events[0].summary}" at this time.`
        });
      }
    }

    res.json({ conflict: false });
  } catch (error) {
    console.error('[TaskController] Conflict check error:', error);
    res.status(500).json({ error: 'Conflict check failed' });
  }
};

exports.getFreeSlots = async (req, res) => {
  try {
    const userId = req.user.id;
    const { date, duration = 30 } = req.query;
    if (!date) return res.status(400).json({ error: 'date is required' });

    const startOfDay = new Date(date);
    startOfDay.setHours(9, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(21, 0, 0, 0);
    const now = new Date();

    let effectiveStart = new Date(startOfDay);
    if (now.toDateString() === startOfDay.toDateString() && now > effectiveStart) {
      effectiveStart = new Date(now);
      effectiveStart.setSeconds(0, 0);
    }

    if (effectiveStart >= endOfDay) {
      return res.json({ success: true, freeSlots: [] });
    }

    const tasks = await taskService.getTasksInRange(userId, effectiveStart, endOfDay);
    const user = await User.findById(userId);
    let events = [];

    if (user?.google_tokens) {
      events = await calendarService.listEvents(user.google_tokens, effectiveStart, endOfDay).catch(error => {
        console.error('[TaskController] Google events fetch failed:', error.message);
        return [];
      });
    }

    const busyBlocks = [
      ...tasks.map(task => ({
        start: new Date(task.due_at),
        end: getTaskEnd(task, 60),
        title: task.title
      })),
      ...events.map(event => ({
        start: new Date(event.start.dateTime || event.start.date),
        end: new Date(event.end.dateTime || event.end.date),
        title: event.summary
      }))
    ]
      .filter(block => block.start && block.end)
      .sort((a, b) => a.start - b.start);

    const freeSlots = [];
    let lastEnd = effectiveStart;

    for (const block of busyBlocks) {
      if (block.end <= effectiveStart) {
        continue;
      }

      const gapMs = block.start.getTime() - lastEnd.getTime();
      if (gapMs >= Number(duration) * 60000) {
        freeSlots.push({
          start: lastEnd.toISOString(),
          end: block.start.toISOString(),
          duration: Math.floor(gapMs / 60000)
        });
      }
      if (block.end > lastEnd) lastEnd = block.end;
    }

    const finalGapMs = endOfDay.getTime() - lastEnd.getTime();
    if (finalGapMs >= Number(duration) * 60000) {
      freeSlots.push({
        start: lastEnd.toISOString(),
        end: endOfDay.toISOString(),
        duration: Math.floor(finalGapMs / 60000)
      });
    }

    res.json({ success: true, freeSlots });
  } catch (error) {
    console.error('[TaskController] Free slots error:', error);
    res.status(500).json({ error: 'Failed to find free slots' });
  }
};

exports.postponeTask = async (req, res) => {
  try {
    const userId = req.user.id;
    const { new_date } = req.body;
    if (!new_date) {
      return res.status(400).json({ error: 'new_date is required' });
    }

    const result = await taskService.postpone(req.params.id, userId, new_date);
    if (result.error) {
      return res.status(result.status || 400).json({ error: result.error });
    }

    await reminderService.syncForTask(result.task).catch(error => {
      console.error('[TaskController] Reminder sync failed during postpone:', error.message);
    });

    await syncTaskToGoogleCalendar(userId, result.task).catch(error => {
      console.error('[TaskController] Google sync failed during postpone:', error.message);
    });

    res.json(result.task);
  } catch (error) {
    console.error('[TaskController] Postpone error:', error);
    res.status(500).json({ error: 'Failed to postpone task', details: error.message });
  }
};

exports.copyToPersonal = async (req, res) => {
  try {
    const userId = req.user.id;
    const originalTask = await Task.findById(req.params.id).lean();
    if (!originalTask) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const { _id, created_at, updated_at, googleEventId, team_id, assigned_to, ...taskData } = originalTask;
    if (taskData.subtasks) {
      taskData.subtasks = taskData.subtasks.map(subtask => {
        const { _id: subtaskId, ...rest } = subtask;
        return rest;
      });
    }

    const newTask = await taskService.create({
      ...taskData,
      team_id: null,
      assigned_to: [],
      created_by: userId
    }, userId);

    res.status(201).json(newTask);
  } catch (error) {
    console.error('[TaskController] Copy to personal error:', error);
    res.status(500).json({ error: 'Failed to copy task' });
  }
};

exports.copyToTeam = async (req, res) => {
  try {
    const userId = req.user.id;
    const { team_id, assigned_to } = req.body;
    if (!team_id) {
      return res.status(400).json({ error: 'team_id is required' });
    }

    const originalTask = await Task.findById(req.params.id).lean();
    if (!originalTask) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const { _id, created_at, updated_at, googleEventId, ...taskData } = originalTask;
    if (taskData.subtasks) {
      taskData.subtasks = taskData.subtasks.map(subtask => {
        const { _id: subtaskId, ...rest } = subtask;
        return rest;
      });
    }

    const newTask = await taskService.create({
      ...taskData,
      team_id,
      assigned_to: assigned_to || [],
      created_by: userId
    }, userId);

    await notifyAssignees(newTask, newTask.assigned_to, userId);
    res.status(201).json(newTask);
  } catch (error) {
    console.error('[TaskController] Copy to team error:', error);
    res.status(500).json({ error: 'Failed to copy task' });
  }
};
