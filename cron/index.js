const cron = require('node-cron');
const cleanupMarketingData = require('./jobs/cleanupMarketingData');
const generateDailyReports = require('./jobs/generateDailyReports');
const backupDatabase = require('./jobs/backupDatabase');

// Store references to scheduled tasks for potential management
const scheduledTasks = {};

/**
 * Initialize all cron jobs
 */
const initCronJobs = () => {
  console.log('⏰ Initializing cron jobs...'.yellow);
  
  // Daily cleanup at midnight (0 0 * * *)
  scheduledTasks.cleanup = cron.schedule('0 0 * * *', cleanupMarketingData, {
    scheduled: true,
    timezone: process.env.TZ || "America/New_York"
  });

  // Daily reports at 2 AM (0 2 * * *)
  scheduledTasks.dailyReports = cron.schedule('0 2 * * *', generateDailyReports, {
    scheduled: true,
    timezone: process.env.TZ || "America/New_York"
  });

  // Weekly backup on Sunday at 3 AM (0 3 * * 0)
  scheduledTasks.backup = cron.schedule('0 3 * * 0', backupDatabase, {
    scheduled: true,
    timezone: process.env.TZ || "America/New_York"
  });
  
  console.log('✅ All cron jobs initialized'.yellow);
  
  return scheduledTasks;
};

/**
 * Stop all cron jobs (for graceful shutdown)
 */
const stopCronJobs = () => {
  Object.values(scheduledTasks).forEach(task => task.stop());
  console.log('⏹️  All cron jobs stopped'.yellow);
};

module.exports = { initCronJobs, stopCronJobs, scheduledTasks };