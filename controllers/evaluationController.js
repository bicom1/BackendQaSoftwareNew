const Evaluation = require('../models/Evaluation');
const mongoose = require('mongoose');
const redis = require('redis');
const Queue = require('bull');
const {redisClient} = require('../config/connection');
const evaluationQueue = require('../queues/evaluationQueue');




const createEvaluation = async (req, res) => {
  try {
    const job = await evaluationQueue.add(req.body, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 }
    });
    
    res.status(202).json({
      message: 'Evaluation queued',
      jobId: job.id,
      queueStatus: {
        waiting: await evaluationQueue.getWaitingCount()
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const createBulkEvaluations = async (req, res) => {
  try {
    const evaluations = req.body;
    
    if (!Array.isArray(evaluations)) {
      return res.status(400).json({ message: 'Input should be an array of evaluations' });
    }

    // Validate each evaluation
    const invalidEvaluations = evaluations.filter(eval => 
      !eval.owner || !eval.useremail || !eval.leadID || 
      !eval.agentName || !eval.mod || !eval.teamleader
    );

    if (invalidEvaluations.length > 0) {
      return res.status(400).json({ 
        message: `${invalidEvaluations.length} evaluations missing required fields`,
        examples: invalidEvaluations.slice(0, 3)
      });
    }

    // Add all evaluations to the queue
    const jobs = evaluations.map(eval => ({
      data: eval,
      opts: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
        timeout: 30000
      }
    }));

    await evaluationQueue.addBulk(jobs);
    
    res.status(202).json({ 
      message: `${evaluations.length} evaluations queued for processing`,
      queueStatus: {
        waiting: await evaluationQueue.getWaitingCount(),
        active: await evaluationQueue.getActiveCount()
      }
    });
  } catch (error) {
    console.error('Error queuing bulk evaluations:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getEvaluations = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 100, 1000); // Max 1000 per page
    const skip = (page - 1) * limit;

    // Build query from optional filters
    const query = {};
    if (req.query.agentName) query.agentName = req.query.agentName;
    if (req.query.teamleader) query.teamleader = req.query.teamleader;
    if (req.query.mod) query.mod = req.query.mod;
    if (req.query.startDate || req.query.endDate) {
      query.createdAt = {};
      if (req.query.startDate) query.createdAt.$gte = new Date(req.query.startDate);
      if (req.query.endDate) query.createdAt.$lte = new Date(req.query.endDate);
    }

    const [evaluations, total] = await Promise.all([
      Evaluation.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Evaluation.countDocuments(query)
    ]);

    // Cache the first page for common queries
    if (page === 1 && Object.keys(query).length > 0) {
      const cacheKey = `evals:${JSON.stringify(query)}`;
      redisClient.setex(cacheKey, 60, JSON.stringify(evaluations)); // Cache for 60 seconds
    }

    res.status(200).json({
      data: evaluations,
      meta: {
        total,
        page,
        pages: Math.ceil(total / limit),
        limit
      }
    });
  } catch (error) {
    console.error('Error fetching evaluations:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getEvaluationById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid evaluation ID' });
    }

    const cacheKey = `eval:${id}`;

    try {
      // Try to get from Redis first (using promises)
      const cachedData = await redisClient.get(cacheKey);
      
      if (cachedData) {
        return res.status(200).json(JSON.parse(cachedData));
      }

      // Not in cache - query database
      const evaluation = await Evaluation.findById(id).lean();

      if (!evaluation) {
        return res.status(404).json({ message: 'Evaluation not found' });
      }

      // Cache for 1 hour (using promises)
      await redisClient.setEx(cacheKey, 3600, JSON.stringify(evaluation));
      return res.status(200).json(evaluation);
      
    } catch (redisError) {
      console.error('Redis error:', redisError);
      // Fallback to DB if Redis fails
      const evaluation = await Evaluation.findById(id).lean();
      if (!evaluation) {
        return res.status(404).json({ message: 'Evaluation not found' });
      }
      return res.status(200).json(evaluation);
    }
  } catch (error) {
    console.error('Error fetching evaluation:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const updateEvaluation = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid evaluation ID' });
    }

    // Prevent changing certain fields
    const protectedFields = ['owner', 'useremail', 'leadID', 'createdAt'];
    protectedFields.forEach(field => delete updateData[field]);

    const evaluation = await Evaluation.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
      lean: true
    });

    if (!evaluation) {
      return res.status(404).json({ message: 'Evaluation not found' });
    }

    // Update cache
    const cacheKey = `eval:${id}`;
    redisClient.setex(cacheKey, 3600, JSON.stringify(evaluation));

    res.status(200).json(evaluation);
  } catch (error) {
    console.error('Error updating evaluation:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const deleteEvaluation = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid evaluation ID' });
    }

    const evaluation = await Evaluation.findByIdAndDelete(id).lean();

    if (!evaluation) {
      return res.status(404).json({ message: 'Evaluation not found' });
    }

    // Clear cache
    const cacheKey = `eval:${id}`;
    redisClient.del(cacheKey);

    res.status(200).json({ 
      message: 'Evaluation deleted successfully',
      deletedEvaluation: evaluation
    });
  } catch (error) {
    console.error('Error deleting evaluation:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Health check for queue
const getQueueStatus = async (req, res) => {
  try {
    const counts = await Promise.all([
      evaluationQueue.getWaitingCount(),
      evaluationQueue.getActiveCount(),
      evaluationQueue.getCompletedCount(),
      evaluationQueue.getFailedCount()
    ]);

    // For Redis v4+, use isOpen instead of connected
    const redisStatus = redisClient.isOpen ? 'connected' : 'disconnected';

    res.status(200).json({
      status: 'operational',
      queueStats: {
        waiting: counts[0],
        active: counts[1],
        completed: counts[2],
        failed: counts[3]
      },
      redisStatus
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: error.message
    });
  }
};

module.exports = {
  createEvaluation,
  createBulkEvaluations,
  getEvaluations,
  getEvaluationById,
  updateEvaluation,
  deleteEvaluation,
  getQueueStatus,
  evaluationQueue// Export for worker processes
};