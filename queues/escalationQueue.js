const Queue = require('bull');
const { redisClient } = require('../index');
const Escalation = require('../models/Escalation');


// Initialize queue
const escalationQueue = new Queue('escalation', {
  redis: {
    url: process.env.REDIS_URL || 'redis://127.0.0.1:6379'
  },
  limiter: {
    max: 1000,       // Max 1000 jobs
    duration: 5000   // Per 5 seconds
  }
});

// Process jobs
escalationQueue.process(5, async (job) => { // Process 5 jobs concurrently
  try {
    console.log(`Processing job ${job.id}`);
    await Escalation.create(job.data);
    console.log(`Completed job ${job.id}`);
    return { status: 'completed' };
  } catch (error) {
    console.error(`Job ${job.id} failed:`, error);
    throw error;
  }
});

// Handle completed jobs
escalationQueue.on('completed', (job, result) => {
  console.log(`Job ${job.id} completed with result:`, result);
});

// Handle failed jobs
escalationQueue.on('failed', (job, err) => {
  console.error(`Job ${job.id} failed with error:`, err);
});

module.exports = escalationQueue;