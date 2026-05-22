const express = require('express');
const cors = require('cors');

const taskRoutes = require('./routes/task.routes');
// const routineRoutes = require('./routes/routine.routes');

const authRoutes = require('./routes/auth.routes'); 
const authMiddleware = require('./middleware/auth.middleware');

const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use('/auth', require('./routes/auth.routes'));
app.use('/api/auth', require('./routes/auth.routes')); // For external Google Redirects
app.use('/user', require('./routes/user.routes'));
app.use('/tasks', require('./routes/task.routes'));
app.use('/calendar', require('./routes/calendar.routes'));
app.use('/teams', require('./routes/team.routes'));
app.use('/notifications', require('./routes/notification.routes'));
app.use('/reminders', require('./routes/reminder.routes'));
app.use('/telegram', require('./routes/telegram.routes')); // Telegram bot routes


app.get('/', (req, res) => {
  res.send('AI Task Manager Backend Running');
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

module.exports = app;
