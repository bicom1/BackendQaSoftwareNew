const Escalation = require('../models/Escalation');
const mongoose = require('mongoose');
const redis = require('redis');
const Queue = require('bull');
const {redisClient} = require('../config/connection');
const escalationQueue = require('../queues/escalationQueue');


const createEscalation = async (req, res) => {
  try {
    const job = await escalationQueue.add(req.body, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 }
    });
    
    res.status(202).json({
      message: 'Escalation queued',
      jobId: job.id,
      queueStatus: {
        waiting: await escalationQueue.getWaitingCount()
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const createBulkEscalation = async (req, res) => {
  try {
    const escalation = req.body;
    
    if (!Array.isArray(escalation)) {
      return res.status(400).json({ message: 'Input should be an array of escalations' });
    }

    // Validate each evaluation
    const invalidEscalation = escalation.filter(eval => 
      !eval.owner || !eval.useremail || !eval.leadID || 
      !eval.agentName || !eval.mod || !eval.teamleader
    );

    if (invalidEscalation.length > 0) {
      return res.status(400).json({ 
        message: `${invalidEscalation.length} evaluations missing required fields`,
        examples: invalidEscalation.slice(0, 3)
      });
    }

    // Add all evaluations to the queue
    const jobs = escalation.map(eval => ({
      data: eval,
      opts: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
        timeout: 30000
      }
    }));

    await evaluationQueue.addBulk(jobs);
    
    res.status(202).json({ 
      message: `${escalation.length} escalation queued for processing`,
      queueStatus: {
        waiting: await evaluationQueue.getWaitingCount(),
        active: await evaluationQueue.getActiveCount()
      }
    });
  } catch (error) {
    console.error('Error queuing bulk escalation:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getEscalation = async (req, res) => {
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

    const [escalation, total] = await Promise.all([
      Escalation.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Escalation.countDocuments(query)
    ]);

    // Cache the first page for common queries
    if (page === 1 && Object.keys(query).length > 0) {
      const cacheKey = `evals:${JSON.stringify(query)}`;
      redisClient.setex(cacheKey, 60, JSON.stringify(escalation)); // Cache for 60 seconds
    }

    res.status(200).json({
      data: escalation,
      meta: {
        total,
        page,
        pages: Math.ceil(total / limit),
        limit
      }
    });
  } catch (error) {
    console.error('Error fetching escalation:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getEscalationById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid escalation ID' });
    }

    const cacheKey = `eval:${id}`;

    try {
      // Try to get from Redis first (using promises)
      const cachedData = await redisClient.get(cacheKey);
      
      if (cachedData) {
        return res.status(200).json(JSON.parse(cachedData));
      }

      // Not in cache - query database
      const escalation = await Escalation.findById(id).lean();

      if (!escalation) {
        return res.status(404).json({ message: 'escalation not found' });
      }

      // Cache for 1 hour (using promises)
      await redisClient.setEx(cacheKey, 3600, JSON.stringify(escalation));
      return res.status(200).json(escalation);
      
    } catch (redisError) {
      console.error('Redis error:', redisError);
      // Fallback to DB if Redis fails
      const escalation = await Escalation.findById(id).lean();
      if (!escalation) {
        return res.status(404).json({ message: 'Escalation not found' });
      }
      return res.status(200).json(escalation);
    }
  } catch (error) {
    console.error('Error fetching Escalation:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const updateEscalation = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid escalation ID' });
    }

    // Prevent changing certain fields
    const protectedFields = ['owner', 'useremail', 'leadID', 'createdAt'];
    protectedFields.forEach(field => delete updateData[field]);

    const escalation = await Escalation.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
      lean: true
    });

    if (!escalation) {
      return res.status(404).json({ message: 'Escalation not found' });
    }

    // Update cache
    const cacheKey = `eval:${id}`;
    redisClient.setex(cacheKey, 3600, JSON.stringify(escalation));

    res.status(200).json(escalation);
  } catch (error) {
    console.error('Error updating escalation:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const deleteEscalation = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid escalation ID' });
    }

    const escalation = await Escalation.findByIdAndDelete(id).lean();

    if (!escalation) {
      return res.status(404).json({ message: 'Escalation not found' });
    }

    // Clear cache
    const cacheKey = `eval:${id}`;
    redisClient.del(cacheKey);

    res.status(200).json({ 
      message: 'Escalation deleted successfully',
      deletedEvaluation: evaluation
    });
  } catch (error) {
    console.error('Error deleting Escalation:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Health check for queue
const getQueueStatus = async (req, res) => {
  try {
    const counts = await Promise.all([
      escalationQueue.getWaitingCount(),
      escalationQueue.getActiveCount(),
      escalationQueue.getCompletedCount(),
      escalationQueue.getFailedCount()
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
  createEscalation,
  createBulkEscalation,
  getEscalation,
  getEscalationById,
  updateEscalation,
  deleteEscalation,
  getQueueStatus
};