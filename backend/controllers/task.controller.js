const taskService = require('../services/task.service');
const User = require('../models/user.model');
const calendarService = require('../services/calendar.service');

// Helper to fetch and map Google Events
const fetchGoogleEventsAsTasks = async (userId, start, end) => {
    try {
        const user = await User.findById(userId);
        if (!user || !user.google_tokens) return [];

        const events = await calendarService.listEvents(user.google_tokens, start, end);
        
        return events.map(e => ({
            _id: e.id, // Use Google ID
            title: e.summary || '(No Title)',
            description: e.description,
            due_at: e.start.dateTime || e.start.date,
            status: 'pending', // Default status
            priority: 3, // Default priority (Normal)
            source: 'google',
            isGoogleEvent: true
        }));
    } catch (err) {
        console.error('[TaskController] Google Fetch Error:', err.message);
        return [];
    }
};

exports.createTask = async (req, res) => {
  try {
    const userId = req.user.id; 
    console.log('[TaskController] Creating task by:', userId);
    const task = await taskService.create(req.body, userId);

    // Sync to Google Calendar if connected
    try {
        const user = await User.findById(userId);
        if (user && user.google_tokens) {
            const fs = require('fs');
            fs.appendFileSync('sync_debug.log', `[${new Date().toISOString()}] Syncing task ${task._id} to Google...\n`);
            try {
                const event = await calendarService.createTaskEvent(user.google_tokens, task);
                fs.appendFileSync('sync_debug.log', `[${new Date().toISOString()}] Sync Success. Event ID: ${event.id}\n`);
            } catch (innerErr) {
                 fs.appendFileSync('sync_debug.log', `[${new Date().toISOString()}] Sync Call Failed: ${innerErr.message}\nPayload: ${JSON.stringify(innerErr.response?.data || 'no data')}\n`);
                 throw innerErr;
            }
        } else {
             require('fs').appendFileSync('sync_debug.log', `[${new Date().toISOString()}] User ${userId} has no google_tokens\n`);
        }
    } catch (syncErr) {
        require('fs').appendFileSync('sync_debug.log', `[${new Date().toISOString()}] Sync Block Error: ${syncErr.message}\n`);
        console.error('[TaskController] Google Sync Failed:', syncErr.message);
    }

    res.status(201).json(task);
  } catch (err) {
    require('fs').appendFileSync('backend_error.log', `[${new Date().toISOString()}] Error: ${err.message}\nStack: ${err.stack}\n`);
    console.error('[TaskController] Error:', err);
    res.status(500).json({ error: 'Failed to create task', details: err.message });
  }
};

exports.getAllTasks = async (req, res) => {
  try {
    const userId = req.user.id;
    const localTasks = await taskService.getAll(userId);
    
    // Fetch upcoming Google Events (e.g., next 90 days)
    const googleTasks = await fetchGoogleEventsAsTasks(
        userId, 
        new Date(), 
        new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
    );

    // Merge and sort
    const allTasks = [...localTasks, ...googleTasks].sort((a, b) => {
        const dateA = new Date(a.due_at || 0);
        const dateB = new Date(b.due_at || 0);
        return dateA - dateB;
    });

    res.json(allTasks);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
};

exports.getTodayTasks = async (req, res) => {
  try {
    const userId = req.user.id;
    const localTasks = await taskService.getToday(userId);

    // Fetch Google Events for Today
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const googleTasks = await fetchGoogleEventsAsTasks(userId, startOfDay, endOfDay);

    // Merge
    const allTasks = [...localTasks, ...googleTasks].sort((a, b) => {
         return new Date(a.due_at) - new Date(b.due_at);
    });

    res.json(allTasks);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch today tasks' });
  }
};

exports.updateTask = async (req, res) => {
  try {
    const userId = req.user.id;
    const task = await taskService.update(req.params.id, userId, req.body);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    res.json(task);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update task' });
  }
};

exports.deleteTask = async (req, res) => {
  try {
    const userId = req.user.id;
    const success = await taskService.delete(req.params.id, userId);
    if (!success) return res.status(404).json({ error: 'Task not found' });
    res.json({ message: 'Task deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete task' });
  }
};
