const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const app = require('./app');
const connectDB = require('./config/db');
const schedulerService = require('./services/scheduler.service');

const PORT = process.env.PORT || 3000;

async function startServer() {
  await connectDB();

  // Initialize Telegram Bot after startup dependencies are ready.
  require('./config/telegram');

  // Start Scheduler only after MongoDB is connected.
  schedulerService.init();

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer().catch((error) => {
  console.error('[Server] Failed to start:', error);
  process.exit(1);
});
