const express = require('express');
const router = express.Router();
const calendarService = require('../services/calendar.service');
const User = require('../models/user.model');
const authMiddleware = require('../middleware/auth.middleware');

// 1. Redirect to Google Auth
// GET /api/calendar/auth
router.get('/auth', (req, res) => {
  const url = calendarService.generateAuthUrl();
  res.json({ url });
});

// 2. Callback from Google
// GET /api/calendar/callback?code=...
// Note: This needs to identify the user. Usually, we'd store state or have the 
// user logged in. For simplicity, we might need a workaround or assume the frontend 
// handles the code exchange by passing the code + JWT to this endpoint.
// Let's do: Frontend receives code -> POST /api/calendar/connect { code } (Authenticated)

router.post('/connect', authMiddleware, async (req, res) => {
  try {
    const { code } = req.body;
    const tokens = await calendarService.getToken(code);
    
    // Save tokens to user
    await User.findByIdAndUpdate(req.user.id, { google_tokens: tokens });
    
    // Initial Sync: Push all future tasks to Google Calendar
    try {
        const Task = require('../models/task.model');
        const futureTasks = await Task.find({
            user_id: req.user.id,
            due_at: { $gte: new Date() } // All future tasks
        });

        console.log(`[CalendarSync] Found ${futureTasks.length} future tasks to sync.`);
        
        for (const task of futureTasks) {
            try {
                await calendarService.createTaskEvent(tokens, task);
                console.log(`[CalendarSync] Synced task: ${task.title}`);
            } catch (innerErr) {
                console.error(`[CalendarSync] Failed to sync task ${task.title}:`, innerErr.message);
            }
        }
    } catch (syncErr) {
        console.error('[CalendarSync] Initial sync failed:', syncErr);
    }

    res.json({ success: true, message: 'Google Calendar connected and tasks synced!' });
  } catch (err) {
    const errorMsg = `[Connection Error] ${err.message}\nStack: ${err.stack}\nDetails: ${JSON.stringify(err.response?.data || {}, null, 2)}`;
    console.error(errorMsg);
    require('fs').writeFileSync('connect_error.log', errorMsg);
    res.status(500).json({ error: 'Failed to connect Google Calendar', details: err.message });
  }
});

// Disconnect Google Calendar
router.post('/disconnect', authMiddleware, async (req, res) => {
    try {
        await User.findByIdAndUpdate(req.user.id, { $unset: { google_tokens: 1 } });
        res.json({ success: true, message: 'Disconnected' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to disconnect' });
    }
});

// Check if connected
router.get('/status', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        res.json({ connected: !!user.google_tokens });
    } catch (err) {
        res.status(500).json({ error: 'Error checking status' });
    }
});

// Get Events
router.get('/events', authMiddleware, async (req, res) => {
    try {
        const { start, end } = req.query;
        if (!start || !end) return res.status(400).json({ error: 'Missing start/end date' });

        const user = await User.findById(req.user.id);
        // 1. Fetch Google Events
        let googleEvents = [];
        if (user.google_tokens) {
            try {
                googleEvents = await calendarService.listEvents(
                    user.google_tokens, 
                    new Date(start), 
                    new Date(end)
                );
            } catch (e) {
                console.error("Google Calendar fetch failed", e.message);
            }
        }
        
        // 2. Fetch Local Tasks
        const localTasks = await require('../models/task.model').find({
            user_id: req.user.id,
            due_at: { $gte: new Date(start), $lte: new Date(end) }
        });

        // Map Google Events
        const mappedGoogle = googleEvents.map(e => ({
            id: e.id,
            title: e.summary,
            start: e.start.dateTime || e.start.date,
            end: e.end.dateTime || e.end.date,
            link: e.htmlLink,
            source: 'google',
            type: 'event'
        }));

        // Map Local Tasks
        const mappedTasks = localTasks.map(t => ({
            id: t._id,
            title: t.title,
            start: t.due_at,
            end: new Date(new Date(t.due_at).getTime() + 60 * 60 * 1000), // Default 1h
            source: 'local',
            type: 'task'
        }));

        res.json({ events: [...mappedGoogle, ...mappedTasks] });
    } catch (err) {
        console.error('Calendar Fetch Error:', err);
        // If 401, tokens might be expired. For now just return empty or error.
        res.status(500).json({ error: 'Failed to fetch events' });
    }
});

// Delete Google Event
router.delete('/events/:id', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user || !user.google_tokens) return res.status(400).json({ error: 'Not connected' });

        await calendarService.deleteEvent(user.google_tokens, 'primary', req.params.id);
        res.json({ success: true, message: 'Event deleted from Google Calendar' });
    } catch (err) {
        console.error('Delete Event Error:', err);
        res.status(500).json({ error: 'Failed to delete event' });
    }
});

module.exports = router;
