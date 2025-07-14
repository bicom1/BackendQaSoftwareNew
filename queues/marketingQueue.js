const Queue = require('bull');
const Marketing = require('../models/Marketing');

const marketingQueue = new Queue('marketing', {
  redis: {
    url: process.env.REDIS_URL || 'redis://127.0.0.1:6379',
  },
  limiter: {
    max: 1000,
    duration: 5000,
  },
});

// Background processing of jobs
marketingQueue.process(5, async (job) => {
  try {
    console.log(`Processing job ${job.id}`);
    await Marketing.create(job.data);
    console.log(`Completed job ${job.id}`);
    return { status: 'completed' };
  } catch (error) {
    console.error(`Job ${job.id} failed:`, error);
    throw error;
  }
});

marketingQueue.on('completed', (job, result) => {
  console.log(`Job ${job.id} completed with result:`, result);
});

marketingQueue.on('failed', (job, err) => {
  console.error(`Job ${job.id} failed with error:`, err);
});

module.exports = marketingQueue;
