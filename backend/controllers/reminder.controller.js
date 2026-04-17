const reminderService = require('../services/reminder.service');
const Task = require('../models/task.model');

function getDayBounds(dateLike = new Date()) {
  const base = new Date(dateLike);
  const start = new Date(base);
  start.setHours(0, 0, 0, 0);
  const end = new Date(base);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

exports.upsertReminder = async (req, res) => {
  try {
    const userId = req.user.id;
    const { task_id, remind_at, offset_minutes } = req.body;

    if (!task_id) {
      return res.status(400).json({ error: 'task_id is required' });
    }

    const task = await Task.findOne({ _id: task_id, user_id: userId });
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    let remindAt = remind_at ? new Date(remind_at) : null;
    const offset = Number.isFinite(offset_minutes) ? offset_minutes : (offset_minutes !== undefined ? Number(offset_minutes) : 30);

    if (!remindAt) {
      if (!task.due_at) {
        return res.status(400).json({ error: 'Task must have a due date to create an offset reminder' });
      }
      remindAt = new Date(new Date(task.due_at).getTime() - offset * 60 * 1000);
    }

    if (Number.isNaN(remindAt.getTime())) {
      return res.status(400).json({ error: 'Invalid remind_at value' });
    }

    const reminder = await reminderService.upsert(task, {
      remind_at: remindAt,
      offset_minutes: Number.isFinite(offset) ? offset : null
    });

    res.status(201).json({
      _id: reminder._id,
      task_id: task._id,
      task_title: task.title,
      remind_at: reminder.remind_at,
      offset_minutes: reminder.offset_minutes,
      status: reminder.status
    });
  } catch (error) {
    console.error('[ReminderController] Upsert reminder error:', error);
    res.status(500).json({ error: 'Failed to save reminder', details: error.message });
  }
};

exports.listReminders = async (req, res) => {
  try {
    const userId = req.user.id;
    const scope = String(req.query.scope || 'all').toLowerCase();
    let range = {};

    if (scope === 'today') {
      range = getDayBounds(new Date());
    } else if (req.query.start || req.query.end) {
      range = {
        start: req.query.start ? new Date(req.query.start) : undefined,
        end: req.query.end ? new Date(req.query.end) : undefined
      };
    }

    const reminders = await reminderService.listForUser(userId, range);
    res.json(reminders.map(reminder => ({
      _id: reminder._id,
      task_id: reminder.task_id?._id,
      task_title: reminder.task_id?.title,
      task_due_at: reminder.task_id?.due_at,
      remind_at: reminder.remind_at,
      offset_minutes: reminder.offset_minutes,
      status: reminder.status
    })));
  } catch (error) {
    console.error('[ReminderController] List reminders error:', error);
    res.status(500).json({ error: 'Failed to fetch reminders' });
  }
};
