// E:\backend\queue\escalationQueue.js
const Queue = require('bull');
const Escalation = require('../models/Escalation'); // Correct path to your Mongoose model

// Ensure dotenv is configured if this file might be imported before server.js
// This is important for process.env.REDIS_URL to be available
require('dotenv').config();

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
    console.log(`[Worker] Processing job ${job.id} with data:`, job.data); // Added [Worker] prefix for clarity
    const savedDoc = await Escalation.create(job.data);
    console.log(`[Worker] Completed job ${job.id}. Document saved to DB:`, savedDoc._id); // Added [Worker] prefix and doc ID
    return { status: 'completed', docId: savedDoc._id }; // Return doc ID for clarity
  } catch (error) {
    console.error(`[Worker] Job ${job.id} failed:`, error); // Added [Worker] prefix
    // Log specific validation errors if available
    if (error.name === 'ValidationError') {
        console.error('[Worker] Mongoose Validation Error Details:', error.errors);
    }
    throw error; // Ensure the error propagates so BullMQ marks the job as failed and retries
  }
});

// Handle completed jobs
escalationQueue.on('completed', (job, result) => {
  console.log(`[Worker] Job ${job.id} completed with result:`, result);
});

// Handle failed jobs
escalationQueue.on('failed', (job, err) => {
  console.error(`[Worker] Job ${job.id} failed with error:`, err.message); // Log error message
  console.error(err); // Log full error object for detailed debugging
});

// Optional: Add more event listeners for better monitoring
escalationQueue.on('active', (job) => {
    console.log(`[Worker] Job ${job.id} is active.`);
});

escalationQueue.on('stalled', (job) => {
    console.warn(`[Worker] Job ${job.id} stalled.`);
});

escalationQueue.on('error', (err) => {
    console.error(`[Worker] Queue error:`, err);
});

module.exports = escalationQueue;