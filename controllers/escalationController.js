const AsyncHandler = require('express-async-handler');
const mongoose = require('mongoose');
const Escalation = require('../models/Escalation');

const createEscalation = async (req, res) => {
  try {
    const escalation = await Escalation.create(req.body);
    res.status(201).json({ message: "Escalation saved", escalation });
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

    // Validate each escalation
    const invalidEscalation = escalation.filter(eval => 
      !eval.owner || !eval.useremail || !eval.leadID || 
      !eval.agentName || !eval.mod || !eval.teamleader
    );

    if (invalidEscalation.length > 0) {
      return res.status(400).json({ 
        message: `${invalidEscalation.length} escalations missing required fields`,
        examples: invalidEscalation.slice(0, 3)
      });
    }

    // Insert all escalations directly
    const createdEscalations = await Escalation.insertMany(escalation);
    
    res.status(201).json({ 
      message: `${createdEscalations.length} escalations created successfully`,
      data: createdEscalations
    });
  } catch (error) {
    console.error('Error creating bulk escalation:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getEscalation = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 100, 1000); 
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

    const escalation = await Escalation.findById(id).lean();

    if (!escalation) {
      return res.status(404).json({ message: 'Escalation not found' });
    }

    return res.status(200).json(escalation);
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

    res.status(200).json({ 
      message: 'Escalation deleted successfully',
      deletedEvaluation: escalation
    });
  } catch (error) {
    console.error('Error deleting Escalation:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getQueueStatus = async (req, res) => {
  try {
    res.status(200).json({
      status: 'Queue functionality removed',
      message: 'Redis and Bull queue dependencies have been removed from this implementation'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: error.message
    });
  }
};

const getescalationsbyfilter = async (req, res) => {
  try {
    const { evaluatedBy, startDate, endDate, team } = req.query;

    const filter = {};

    if (evaluatedBy) {
      filter.evaluatedBy = evaluatedBy;
    }

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    if (team) {
      filter.team = team; 
    }

    const escalations = await Escalation.find(filter).sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: escalations });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error });
  }
};

const totalescalationcounts = AsyncHandler(async(req,res)=>{
  const count = await Escalation.countDocuments();
  res.status(200).json({success:true,count})
})

const dateFilterescalation = async (req, res) => {
  try {
    const { startDate, endDate, agentName, teamleader } = req.query;
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: "Both startDate and endDate are required.",
      });
    }

    const formattedStartDate = new Date(startDate);
    const formattedEndDate = new Date(endDate);

    if (isNaN(formattedStartDate.getTime()) || isNaN(formattedEndDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid date format. Use YYYY-MM-DD.",
      });
    }

    const query = {
      createdAt: {
        $gte: new Date(formattedStartDate.setUTCHours(0, 0, 0, 0)),
        $lt: new Date(formattedEndDate.setUTCHours(23, 59, 59, 999)),
      },
    };

    if (teamleader && teamleader.trim() !== "") {
      query.teamleader = { $regex: new RegExp(teamleader, "i") };
    }

    if (agentName && agentName.trim() !== "") {
      query.agentName = { $regex: new RegExp(agentName, "i") };
    }

    const filteredData = await Escalation.find(query);

    if (!filteredData || filteredData.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No data found for the selected date range.",
      });
    }

    res.status(200).json({
      success: true,
      data: filteredData,
    });
  } catch (error) {
    console.error("Error in getCalendarFilterDataEscalation:", error);
    res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
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
  getQueueStatus,
  getescalationsbyfilter,
  totalescalationcounts,
  dateFilterescalation
};