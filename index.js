/**
 * Application entrypoint
 * - Loads environment, connects MongoDB and Redis
 * - Boots Express with security middleware and CORS
 * - Mounts feature routes (users, evaluations, escalations, marketing, analytics, Bitrix24)
 * - Initializes and exposes cron jobs management endpoints
 */
require('dotenv').config();
const express = require('express');
const colors = require('colors');
const helmet = require('helmet');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');

// Config
const { validateEnv } = require('./config/env');
const connectDB = require('./config/db');
const redisClient = require('./config/redis');

// Middleware
const requestLogger = require('./middlewares/logger');
const errorHandler = require('./middlewares/errorHandler');

// Express init
const app = express();
const PORT = process.env.PORT || 3001;

// Validate env
validateEnv();

// Mongo + Redis
(async () => {
  try {
    await connectDB();
    await redisClient.connect();
    console.log('✅ MongoDB & Redis connected'.green);
  } catch (err) {
    console.error('❌ Failed to initialize services:'.red, err);
    process.exit(1);
  }
})();

// Middleware
app.use(helmet());
app.use(cors({
  // origin: "http://localhost:5173",
  origin: "https://qasoftwaretesting.vercel.app/",

  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(requestLogger);

// Routes
// User auth/profile + presence tracking
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/bitrix24', require('./routes/bitrix24Routes'));
app.use('/api/evaluations', require('./routes/evaluationRoutes'));
app.use('/api/escalations', require('./routes/escalationRoutes'));
app.use('/api/marketing', require('./routes/marketingRoutes'));
app.use('/api/teamlead', require('./routes/teamleadRoutes'));
app.use('/api/analytics', require('./routes/analyticsRoutes'));
app.use('/api/agents', require('./routes/agentsRoutes'));
app.use('/api/feedback', require('./routes/feedbackRoutes'));

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    redis: redisClient.isOpen ? 'connected' : 'disconnected'
  });
});

// Root
app.get('/', (req, res) => {
  res.send('Bitrix24 API Caller Service is Running!');
});

// Error handler
app.use(errorHandler);

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down gracefully...'.yellow);
  try {
    await mongoose.connection.close();
    await redisClient.quit();
    console.log('✅ All connections closed. Goodbye!'.green);
    process.exit(0);
  } catch (err) {
    console.error('❌ Error during shutdown:'.red, err);
    process.exit(1);
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${String(PORT).bgWhite}`.yellow);
});

module.exports = { app, redisClient };
