require('dotenv').config();
const express = require('express');
const colors = require('colors');
const mongoose = require('mongoose');
const redis = require('redis');
const helmet = require('helmet');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

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

redisClient.on('error', (err) => {
  console.error('Redis error:'.red, err);
});

redisClient.on('connect', () => {
  console.log('Redis connected successfully'.bgGreen);
});

// Database connections
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URL);
    console.log(`Database connected: ${mongoose.connection.host}`.bgCyan);
  } catch (error) {
    console.error('Database connection failed:'.red, error);
    process.exit(1);
  }
};

// Initialize Redis and DB
(async () => {
  await redisClient.connect();
  await connectDB();
})();

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*'
}));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Debug middleware
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

app.get('/', (req, res) => {
  res.send('Bitrix24 API Caller Service is Running!');
});

// Error handling
app.use((err, req, res, next) => {
  console.error("Unhandled Error:".red, err.stack);
  res.status(500).json({
    success: false,
    message: 'An unexpected error occurred'
  });
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  await redisClient.quit();
  process.exit(0);
});

app.listen(PORT, () => {
  console.log(`Server started on Port: ${String(PORT).bgWhite}`.yellow);
  if (!process.env.BITRIX_API_BASE_URL) {
    console.warn("WARNING: BITRIX_API_BASE_URL is not defined".bgRed.white);
  }
});

module.exports = { redisClient };