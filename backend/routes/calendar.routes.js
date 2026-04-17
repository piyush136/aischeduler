const express = require('express');
const router = express.Router();
const calendarService = require('../services/calendar.service');
const taskService = require('../services/task.service');
const User = require('../models/user.model');
const Task = require('../models/task.model');
const authMiddleware = require('../middleware/auth.middleware');

async function syncFutureTasksForUser(userId, tokens) {
  const futureTasks = await Task.find({
    user_id: userId,
    due_at: { $gte: new Date() }
  });

  let synced = 0;
  const errors = [];

  for (const task of futureTasks) {
    try {
      const event = await calendarService.createTaskEvent(tokens, task);
      if (event?.id) {
        await taskService.update(task._id, userId, { googleEventId: event.id });
      }
      synced += 1;
    } catch (error) {
      errors.push({ taskId: task._id, title: task.title, error: error.message });
    }
  }

  return {
    total: futureTasks.length,
    synced,
    failed: errors.length,
    errors
  };
}

router.get('/auth', (req, res) => {
  const url = calendarService.generateAuthUrl();
  res.json({ url });
});

router.post('/connect', authMiddleware, async (req, res) => {
  try {
    const { code } = req.body;
    const tokens = await calendarService.getToken(code);
    await User.findByIdAndUpdate(req.user.id, { google_tokens: tokens });

    const syncSummary = await syncFutureTasksForUser(req.user.id, tokens);

    res.json({
      success: true,
      message: 'Google Calendar connected and tasks synced.',
      syncSummary
    });
  } catch (error) {
    console.error('[CalendarRoutes] Connect error:', error);
    res.status(500).json({ error: 'Failed to connect Google Calendar', details: error.message });
  }
});

router.post('/sync', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user?.google_tokens) {
      return res.status(400).json({ error: 'Google Calendar is not connected' });
    }

    const syncSummary = await syncFutureTasksForUser(req.user.id, user.google_tokens);
    res.json({ success: true, syncSummary });
  } catch (error) {
    console.error('[CalendarRoutes] Sync error:', error);
    res.status(500).json({ error: 'Failed to sync calendar', details: error.message });
  }
});

router.post('/disconnect', authMiddleware, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user.id, { $unset: { google_tokens: 1 } });
    res.json({ success: true, message: 'Disconnected Google Calendar' });
  } catch (error) {
    console.error('[CalendarRoutes] Disconnect error:', error);
    res.status(500).json({ error: 'Failed to disconnect' });
  }
});

router.get('/status', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.json({ connected: !!user?.google_tokens });
  } catch (error) {
    res.status(500).json({ error: 'Error checking status' });
  }
});

router.get('/events', authMiddleware, async (req, res) => {
  try {
    const { start, end } = req.query;
    if (!start || !end) {
      return res.status(400).json({ error: 'Missing start/end date' });
    }

    const user = await User.findById(req.user.id);
    const localTasks = await Task.find({
      user_id: req.user.id,
      due_at: { $gte: new Date(start), $lte: new Date(end) }
    });

    let googleEvents = [];
    if (user?.google_tokens) {
      try {
        googleEvents = await calendarService.listEvents(user.google_tokens, start, end);
      } catch (error) {
        console.error('[CalendarRoutes] Google fetch failed:', error.message);
      }
    }

    const mappedTasks = localTasks.map(task => ({
      id: task._id,
      title: task.title,
      start: task.due_at,
      end: task.has_time === false
        ? task.due_at
        : new Date(new Date(task.due_at).getTime() + (task.duration_minutes || 60) * 60 * 1000),
      source: 'local',
      type: 'task'
    }));

    const mappedGoogleEvents = googleEvents.map(event => ({
      id: event.id,
      title: event.summary || 'Google Calendar Event',
      start: event.start?.dateTime || event.start?.date,
      end: event.end?.dateTime || event.end?.date,
      source: 'google',
      type: 'calendar_event'
    }));

    res.json({
      connected: !!user?.google_tokens,
      events: mappedTasks,
      externalEvents: mappedGoogleEvents
    });
  } catch (error) {
    console.error('[CalendarRoutes] Events error:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

router.delete('/events/:id', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user?.google_tokens) {
      return res.status(400).json({ error: 'Not connected' });
    }

    await calendarService.deleteEvent(user.google_tokens, 'primary', req.params.id);
    res.json({ success: true, message: 'Event deleted from Google Calendar' });
  } catch (error) {
    console.error('[CalendarRoutes] Delete event error:', error);
    res.status(500).json({ error: 'Failed to delete event' });
  }
});

module.exports = router;
