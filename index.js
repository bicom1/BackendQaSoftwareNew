require('dotenv').config();
const express = require('express');
const colors = require('colors');
const mongoose = require('mongoose');
const redis = require('redis');
const helmet = require('helmet');
const cors = require('cors');
const path = require('path');
const { apiReference } = require('@scalar/express-api-reference');
const app = express();
const PORT = process.env.PORT || 3001;

app.use(
        '/api-docs',
        apiReference({
            // Your configuration goes here, e.g., URL to your OpenAPI document
            url: '/openapi.json',
        }),
    );


// Environment validation
const requiredEnvVars = ['MONGO_URL'];
requiredEnvVars.forEach(varName => {
  if (!process.env[varName]) {
    console.error(`CRITICAL: Missing required environment variable: ${varName}`.bgRed);
    process.exit(1);
  }
});

// Redis client setup
const redisClient = redis.createClient({
  url: process.env.REDIS_URL || 'redis://127.0.0.1:6379'
});
redisClient.on('error', (err) => console.error('Redis error:'.red, err));
redisClient.on('connect', () => console.log('Redis connected successfully'.bgGreen));

// MongoDB connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URL);
    console.log(`Database connected: ${mongoose.connection.host}`.bgCyan);
  } catch (error) {
    console.error('Database connection failed:'.red, error);
    process.exit(1);
  }
};

// Connect to DB + Redis, then start cron
(async () => {
  try {
    await redisClient.connect();
    await connectDB();

    // Initialize all cron jobs
    const { initCronJobs } = require('./cron');
    initCronJobs();

    console.log('✅ Cron jobs initialized'.yellow);
  } catch (error) {
    console.error('❌ Initialization failed:'.red, error);
    process.exit(1);
  }
})();

// Middleware
app.use(helmet());
app.use(cors({
  // origin: "http://localhost:5173", 
  origin:"https://qasoftwaretesting.vercel.app",
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Global request logger
app.use((req, res, next) => {
  console.log('--- GLOBAL DEBUG: Request Received ---'.magenta);
  console.log('Method:'.magenta, req.method);
  console.log('URL:'.magenta, req.originalUrl);
  next();
});

// Routes
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/bitrix24', require('./routes/bitrix24Routes'));
app.use('/api/evaluations', require('./routes/evaluationRoutes'));
app.use('/api/escalations', require('./routes/escalationRoutes'));
app.use('/api/marketing', require('./routes/marketingRoutes'));
app.use('/api/teamlead', require('./routes/teamleadRoutes'));
app.use('/api/analytics', require('./routes/analyticsRoutes'));
// app.use('/api/agents', require('./routes/agentsRoutes'));

// Add cron management routes (consider protecting these in production)
app.get('/api/cron/status', (req, res) => {
  try {
    const { scheduledTasks } = require('./cron');
    const status = {};
    
    Object.entries(scheduledTasks).forEach(([name, task]) => {
      status[name] = {
        running: task.getStatus() === 'started',
        nextDates: task.nextDates(3) // Next 3 execution times
      };
    });
    
    res.json({ success: true, cronJobs: status });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// For development/testing - manually trigger a job
if (process.env.BITRIX_API_BASE_URL ) {
  app.post('/api/cron/trigger/:job', async (req, res) => {
    const jobName = req.params.job;
    
    try {
      let result;
      // IMPORTANT FIX: You need to destructure the function from the module
      switch(jobName) {
        case 'cleanup':
          const { cleanupMarketingData } = require('./cron/jobs/cleanupMarketingData');
          result = await cleanupMarketingData();
          break;
        case 'reports':
          const { generateDailyReports } = require('./cron/jobs/generateDailyReports');
          result = await generateDailyReports();
          break;
        case 'backup':
          const { backupDatabase } = require('./cron/jobs/backupDatabase');
          result = await backupDatabase();
          break;
        case 'bitrix':
          const { syncBitrixData } = require('./cron/jobs/syncBitrixData');
          result = await syncBitrixData();
          break;
        default:
          return res.status(404).json({ 
            success: false, 
            message: 'Job not found. Available jobs: cleanup, reports, backup, bitrix' 
          });
      }
      
      res.json({ success: true, result });
    } catch (error) {
      console.error('Trigger job error:'.red, error);
      res.status(500).json({ 
        success: false, 
        message: error.message 
      });
    }
  });
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    redis: redisClient.isOpen ? 'connected' : 'disconnected'
  });
});

app.get('/', (req, res) => {
  res.send('Bitrix24 API Caller Service is Running!');
});

// Error handler
app.use((err, req, res, next) => {
  console.error("Unhandled Error:".red, err.stack);
  res.status(500).json({
    success: false,
    message: 'An unexpected error occurred'
  });
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down gracefully...'.yellow);
  
  try {
    const { stopCronJobs } = require('./cron');
    stopCronJobs();
    await mongoose.connection.close();
    await redisClient.quit();
    console.log('✅ All connections closed. Goodbye!'.green);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:'.red, error);
    process.exit(1);
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server started on Port: ${String(PORT).bgWhite}`.yellow);
  if (!process.env.BITRIX_API_BASE_URL) {
    console.warn("WARNING: BITRIX_API_BASE_URL is not defined".bgRed.white);
  }
});

module.exports = { app, redisClient };