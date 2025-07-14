const userModel = require("../models/usermodel");
const marketingModel = require("../models/Marketing");
const marketingQueue = require("../queues/marketingQueue");

exports.createMarketing = async (req, res) => {
  try {
    const marketingDate = new Date();
    const utcDate = new Date(
      Date.UTC(
        marketingDate.getFullYear(),
        marketingDate.getMonth(),
        marketingDate.getDate()
      )
    );

    const user = await userModel.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "User not found", success: false });
    }

    const data = {
      owner: req.user._id,
      leadID: req.body.leadId,
      teamleader: req.body.teamleader,
      branch: req.body.branch,
      source: req.body.source,
      leadQuality: req.body.leadQuality,
      createdAt: utcDate,
    };

    // Save to MongoDB
    const marketing = new marketingModel(data);
    await marketing.save();

    // Update user evaluation detail
    await userModel.findByIdAndUpdate(req.user._id, {
      $push: { evaluationdetail: marketing._id },
    });

    // Also push to Redis Queue for background processing
    await marketingQueue.add(data); // You can also pass options like priority, delay etc.

    return res.status(201).json({
      message: "Marketing data saved and queued successfully",
      success: true,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message, success: false });
  }
}; 

// @desc    Create bulk marketing entries
// @route   POST /api/marketing/bulk
// @access  Private
exports.createBulkMarketing = async (req, res) => {
  try {
    const { entries } = req.body;
    
    if (!Array.isArray(entries) || entries.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide an array of marketing entries' 
      });
    }

    // Validate each entry
    const validatedEntries = entries.map(entry => ({
      owner: req.user._id,
      leadID: entry.leadId,
      teamleader: entry.teamleader,
      branch: entry.branch,
      source: entry.source,
      leadQuality: entry.leadQuality,
    }));

    // Option 1: Direct MongoDB insert (faster)
    const result = await marketingModel.insertMany(validatedEntries);
    
    // Option 2: Add to queue (better for very large batches)
    // await marketingQueue.addBulk(validatedEntries.map(data => ({ data })));

    // Update user with evaluation details
    await userModel.findByIdAndUpdate(req.user._id, {
      $push: { evaluationdetail: { $each: result.map(r => r._id) } }
    });

    res.status(201).json({
      success: true,
      count: result.length,
      data: result
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get all marketing evaluations
// @route   GET /api/marketing/getevaluations
// @access  Private
exports.getMarketing = async (req, res) => {
  try {
    const { page = 1, limit = 10, ...filters } = req.query;
    
    const query = { owner: req.user._id, ...filters };
    
    const evaluations = await marketingModel.find(query)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const count = await marketingModel.countDocuments(query);

    res.status(200).json({
      success: true,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      count,
      data: evaluations
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get single marketing evaluation by ID
// @route   GET /api/marketing/getevaluationbyid/:id
// @access  Private
exports.getMarketingById = async (req, res) => {
  try {
    const evaluation = await marketingModel.findOne({
      _id: req.params.id,
      owner: req.user._id
    });

    if (!evaluation) {
      return res.status(404).json({
        success: false,
        message: 'Evaluation not found'
      });
    }

    res.status(200).json({
      success: true,
      data: evaluation
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get queue status
// @route   GET /api/marketing/queue/status
// @access  Private
exports.getQueueStatus = async (req, res) => {
  try {
    const counts = await marketingQueue.getJobCounts();
    const isPaused = await marketingQueue.isPaused();

    res.status(200).json({
      success: true,
      data: {
        ...counts,
        isPaused
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update marketing evaluation
// @route   PUT /api/marketing/evaluations/:id
// @access  Private
exports.updateMarketing = async (req, res) => {
  try {
    const { leadId, teamleader, branch, source, leadQuality } = req.body;
    
    const evaluation = await marketingModel.findOneAndUpdate(
      { 
        _id: req.params.id,
        owner: req.user._id 
      },
      {
        leadID: leadId,
        teamleader,
        branch,
        source,
        leadQuality
      },
      { new: true, runValidators: true }
    );

    if (!evaluation) {
      return res.status(404).json({
        success: false,
        message: 'Evaluation not found'
      });
    }

    res.status(200).json({
      success: true,
      data: evaluation
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete marketing evaluation
// @route   DELETE /api/marketing/evaluations/:id
// @access  Private
exports.deleteMarketing = async (req, res) => {
    try {
      const evaluation = await marketingModel.findOneAndDelete({
        _id: req.params.id,
        owner: req.user._id
      });
  
      if (!evaluation) {
        return res.status(404).json({
          success: false,
          message: 'Evaluation not found'
        });
      }
  
      // Remove from user's evaluationdetail array
      await userModel.findByIdAndUpdate(req.user._id, {
        $pull: { evaluationdetail: req.params.id }
      });
  
      res.status(200).json({
        success: true,
        data: {}
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  };
