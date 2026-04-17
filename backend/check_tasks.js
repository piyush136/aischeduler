require('dotenv').config({ path: './.env' });
const mongoose = require('mongoose');
const Task = require('./models/task.model');

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(async () => {
    console.log('Connected to MongoDB');
    
    // Check all tasks
    const tasks = await Task.find({}).sort({ created_at: -1 }).limit(10);
    
    console.log('--- RECENT 10 TASKS ---');
    const now = new Date();
    tasks.forEach(t => {
      console.log(`Title: ${t.title}`);
      console.log(`  Due At (DB raw): ${t.due_at}`);
      console.log(`  email_reminder_sent: ${t.email_reminder_sent}`);
      console.log(`  Status: ${t.status}`);
      if (t.due_at) {
          const diffMins = (new Date(t.due_at) - now) / 60000;
          console.log(`  Time from Now: ${diffMins.toFixed(2)} mins`);
      }
      console.log('-----------------------');
    });

    mongoose.connection.close();
  })
  .catch(err => {
    console.error('Mongo Error', err);
    process.exit(1);
  });
