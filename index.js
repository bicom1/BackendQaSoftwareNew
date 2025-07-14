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


const redisClient = redis.createClient({
  url: process.env.REDIS_URL || 'redis://127.0.0.1:6379'
});

redisClient.on('error', (err) => {
  console.error('Redis error:'.red, err);
});

redisClient.on('connect', () => {
  console.log('Redis connected successfully'.bgGreen);
});


const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URL);
    console.log(`Database connected: ${mongoose.connection.host}`.bgCyan);
  } catch (error) {
    console.error('Database connection failed:'.red, error);
    process.exit(1);
  }
};


(async () => {
  await redisClient.connect();
  await connectDB();
})();


app.use(helmet());
app.use(cors({
  origin: "http://localhost:5173", // Allow frontend origin
  credentials: true                // Allow cookies/token headers
}));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));


app.use((req, res, next) => {
  console.log('--- GLOBAL DEBUG: Request Received ---'.magenta);
  console.log('Method:'.magenta, req.method);
  console.log('URL:'.magenta, req.originalUrl);
  next();
});

// Routes
app.use('/api/users', require('./routes/userRoutes'));

// bitrix
app.use('/api/bitrix24', require('./routes/bitrix24Routes'));


app.use('/api/evaluations', require('./routes/evaluationRoutes'));
app.use('/api/escalations', require('./routes/escalationRoutes'));
app.use('/api/marketing', require('./routes/marketingRoutes'));
app.use('/api/teamlead', require('./routes/teamleadRoutes'));
// app.use ('/api/agents', require('./routes/agentsRoutes'));





app.get('/', (req, res) => {
  res.send('Bitrix24 API Caller Service is Running!');
});


app.use((err, req, res, next) => {
  console.error("Unhandled Error:".red, err.stack);
  res.status(500).json({
    success: false,
    message: 'An unexpected error occurred'
  });
});


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