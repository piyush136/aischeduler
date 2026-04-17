require('dotenv').config();

const app = require('./app');
const schedulerService = require('./services/scheduler.service');

const PORT = process.env.PORT || 3000;

// Start Scheduler
schedulerService.init();

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
