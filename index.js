require('dotenv').config();
const express = require('express');
const colors = require('colors');
const mongoose = require('mongoose');
const redis = require('redis');
const helmet = require('helmet');
const cors = require('cors');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3001;

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
  await redisClient.connect();
  await connectDB();

  // Initialize all cron jobs
  const { initCronJobs } = require('./cron');
  initCronJobs();

  console.log('✅ Cron jobs initialized'.yellow);
})();

// Middleware
app.use(helmet());
app.use(cors({
  origin: "http://localhost:5173",
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
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/api/bitrix24', require('./routes/bitrix24Routes'));
app.use('/api/evaluations', require('./routes/evaluationRoutes'));
app.use('/api/escalations', require('./routes/escalationRoutes'));
app.use('/api/marketing', require('./routes/marketingRoutes'));
app.use('/api/teamlead', require('./routes/teamleadRoutes'));
app.use('/api/analytics', require('./routes/analyticsRoutes'));
// app.use('/api/agents', require('./routes/agentsRoutes'));

// Add cron management routes (consider protecting these in production)
app.get('/api/cron/status', (req, res) => {
  const { scheduledTasks } = require('./cron');
  const status = {};
  
  Object.entries(scheduledTasks).forEach(([name, task]) => {
    status[name] = {
      running: task.getStatus() === 'started',
      nextDates: task.nextDates(3) // Next 3 execution times
    };
  });
  
  res.json({ success: true, cronJobs: status });
});

// For development/testing - manually trigger a job
if (process.env.NODE_ENV !== 'production') {
  app.post('/api/cron/trigger/:job', async (req, res) => {
    const jobName = req.params.job;
    
    try {
      let result;
      switch(jobName) {
        case 'cleanup':
          result = await require('./cron/jobs/cleanupMarketingData')();
          break;
        case 'reports':
          result = await require('./cron/jobs/generateDailyReports')();
          break;
        case 'backup':
          result = await require('./cron/jobs/backupDatabase')();
          break;
        default:
          return res.status(404).json({ 
            success: false, 
            message: 'Job not found' 
          });
      }
      
      res.json({ success: true, result });
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        message: error.message 
      });
    }
  });
}

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
  const { stopCronJobs } = require('./cron');
  stopCronJobs();
  await mongoose.connection.close();
  await redisClient.quit();
  process.exit(0);
});

// Start server
app.listen(PORT, () => {
  console.log(`Server started on Port: ${String(PORT).bgWhite}`.yellow);
  if (!process.env.BITRIX_API_BASE_URL) {
    console.warn("WARNING: BITRIX_API_BASE_URL is not defined".bgRed.white);
  }
});

module.exports = { redisClient };