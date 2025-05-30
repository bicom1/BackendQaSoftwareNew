const mongoose = require('mongoose');
const redis = require('redis');
const colors = require('colors');

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URL, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log(`Database connected: ${mongoose.connection.host}`.cyan);
    } catch (error) {
        console.error('Database connection failed:'.red, error.message);
        process.exit(1);
    }
};


const redisClient = redis.createClient({url: process.env.REDIS_URL})

redisClient.on('error', (err) => 
    console.error(colors.red('Redis Error:'), err));
  redisClient.on('connect', () => 
    console.log(colors.bgBlue('Redis Connected')));

  const connectRedis = async () => {
    try {
      await redisClient.connect();
    } catch (err) {
      console.error(colors.red('Redis Connection Error:'), err);
      setTimeout(connectRedis, 5000);
    }
  };

  module.exports = { connectDB, redisClient, connectRedis };