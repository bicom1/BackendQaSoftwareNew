const Queue = require('bull');
const mongoose = require('mongoose');
const Evaluation = require('../models/Evaluation');

// Bull queue for background evaluation ingestion with rate limiting
const evaluationQueue = new Queue('evaluation', {
  redis: {
    url: process.env.REDIS_URL || 'redis://127.0.0.1:6379'
  },
  limiter: {
    max: 1000,
    duration: 5000
  }
});

// Process up to 5 jobs concurrently
evaluationQueue.process(5, async (job) => {
  try {
    const data = job.data;

    // Required fields validation
    const requiredFields = ['owner', 'useremail', 'leadID', 'evaluatedby', 'agentName'];
    for (const field of requiredFields) {
      if (!data[field]) {
        console.error(`Missing required field: ${field}`, data);
        throw new Error(`Missing required field: ${field}`);
      }
    }

    if (!mongoose.Types.ObjectId.isValid(data.owner)) {
      console.error("Invalid ObjectId for 'owner':", data.owner);
      throw new Error("Invalid MongoDB ObjectId for 'owner'");
    }

    console.log(`Processing job ${job.id} for leadID: ${data.leadID}`);

    const evaluationDoc = await Evaluation.create(data);

    console.log(`✅ Evaluation saved with ID: ${evaluationDoc._id}`);

    return { status: 'completed', id: evaluationDoc._id };
  } catch (error) {
    console.error(`❌ Job ${job.id} failed:`, error.message);
    if (error.errors) console.error("Validation errors:", error.errors);
    throw error;
  }
});

evaluationQueue.on('completed', (job, result) => {
  console.log(`✅ Job ${job.id} completed with result:`, result);
});

evaluationQueue.on('failed', (job, err) => {
  console.error(`❌ Job ${job.id} failed with error:`, err.message);
});

module.exports = evaluationQueue;
