require('dotenv').config();
const cron = require('node-cron');
const colors = require('colors');

// This object will hold references to our scheduled tasks for management
const scheduledTasks = {};

/**
 * Initializes all defined cron jobs
 */
const initCronJobs = () => {
  console.log('🕒 Initializing Cron Jobs...'.yellow);

  try {
    // --- Import Job Functions ---
    // Use absolute paths to avoid issues
    const cleanupModule = require('./jobs/cleanupMarketingData');
    const reportsModule = require('./jobs/generateDailyReports');
    const backupModule = require('./jobs/backupDatabase');
    const bitrixModule = require('./jobs/syncBitrixData');

    // Destructure after requiring to see what we get
    const { cleanupMarketingData } = cleanupModule;
    const { generateDailyReports } = reportsModule;
    const { backupDatabase } = backupModule;
    const { syncBitrixData } = bitrixModule;

    // Validate that the imported functions exist
    if (typeof cleanupMarketingData !== 'function') throw new Error('cleanupMarketingData is not a function');
    if (typeof generateDailyReports !== 'function') throw new Error('generateDailyReports is not a function');
    if (typeof backupDatabase !== 'function') throw new Error('backupDatabase is not a function');
    if (typeof syncBitrixData !== 'function') throw new Error('syncBitrixData is not a function');

   
    scheduledTasks.cleanup = cron.schedule(
      '0 2 * * *',
      cleanupMarketingData,
      { 
        scheduled: true, 
        timezone: "America/New_York"
      }
    );
    console.log('   ✅ Scheduled: Marketing Data Cleanup (Daily 2:00 AM)'.green);

   
    scheduledTasks.reports = cron.schedule(
      '0 8 * * *',
      generateDailyReports,
      { scheduled: true, timezone: "America/New_York" }
    );
    console.log('   ✅ Scheduled: Daily Reports (Daily 8:00 AM)'.green);

    
    scheduledTasks.backup = cron.schedule(
      '0 1 * * 0', // 0 for Sunday
      backupDatabase,
      { scheduled: true, timezone: "America/New_York" }
    );
    console.log('   ✅ Scheduled: Weekly Database Backup (Sunday 1:00 AM)'.green);

    // 4. BITRIX SYNC JOB (Runs every 10 minutes)
    scheduledTasks.bitrixSync = cron.schedule(
      '*/10 * * * *', // Every 10 minutes
      syncBitrixData,
      { scheduled: true, timezone: "America/New_York" }
    );
    console.log('   ✅ Scheduled: Bitrix Data Sync (Every 10 minutes)'.green);

    console.log('✅ All cron jobs have been scheduled successfully.'.bgGreen);

  } catch (error) {
    console.error('❌ Failed to initialize cron jobs:'.red, error.message);
  }
};

/**
 * Gracefully stops all running cron jobs
 */
const stopCronJobs = () => {
  console.log('🛑 Stopping all cron jobs...'.yellow);
  for (const taskName in scheduledTasks) {
    if (scheduledTasks[taskName]) {
      scheduledTasks[taskName].stop();
      console.log(`   Stopped: ${taskName}`.yellow);
    }
  }
};

module.exports = {
  initCronJobs,
  stopCronJobs,
  scheduledTasks
};