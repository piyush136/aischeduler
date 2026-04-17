require('dotenv').config({ path: './.env' });
const mongoose = require('mongoose');
const Task = require('./models/task.model');

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(async () => {
    console.log('Connected to MongoDB.\n');
    
    // Check all tasks
    const tasks = await Task.find({}).sort({ created_at: -1 }).limit(5);
    
    console.log('--- LATEST 5 TASKS IN DB ---');
    const now = new Date();
    console.log(`CURRENT TIME (Server/Node): ${now.toISOString()} (${now.toString()})\n`);

    tasks.forEach(t => {
      console.log(`Title: ${t.title}`);
      console.log(`  Raw Due At (DB): ${t.due_at ? t.due_at.toISOString() : 'NULL'}`);
      console.log(`  Raw Due At (Local): ${t.due_at ? t.due_at.toString() : 'NULL'}`);
      console.log(`  Created At: ${t.created_at ? t.created_at.toISOString() : 'NULL'}`);
      console.log(`  email_reminder_sent: ${t.email_reminder_sent}`);
      console.log(`  Status: ${t.status}`);
      if (t.due_at) {
          const diffMins = (new Date(t.due_at).getTime() - now.getTime()) / 60000;
          console.log(`  Time left from now: ${diffMins.toFixed(2)} mins`);
      }
      console.log('-----------------------');
    });

    mongoose.connection.close();
  })
  .catch(err => {
    console.error('Mongo Error', err);
    process.exit(1);
  });
