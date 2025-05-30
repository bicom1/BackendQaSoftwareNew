const Queue = require('bull');
const { redisClient } = require('../index');
const Evaluation = require('../models/Evaluation');

// Initialize queue
const evaluationQueue = new Queue('evaluations', {
  redis: {
    url: process.env.REDIS_URL || 'redis://127.0.0.1:6379'
  },
  limiter: {
    max: 1000,       // Max 1000 jobs
    duration: 5000   // Per 5 seconds
  }
});

// Process jobs
evaluationQueue.process(5, async (job) => { // Process 5 jobs concurrently
  try {
    console.log(`Processing job ${job.id}`);
    await Evaluation.create(job.data);
    console.log(`Completed job ${job.id}`);
    return { status: 'completed' };
  } catch (error) {
    console.error(`Job ${job.id} failed:`, error);
    throw error;
  }
});

// Handle completed jobs
evaluationQueue.on('completed', (job, result) => {
  console.log(`Job ${job.id} completed with result:`, result);
});

// Handle failed jobs
evaluationQueue.on('failed', (job, err) => {
  console.error(`Job ${job.id} failed with error:`, err);
});

module.exports = evaluationQueue;