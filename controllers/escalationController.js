import AsyncHandler from 'express-async-handler';
import Escalation from '../models/Escalation.js';


const createEscalation = AsyncHandler(async (req, res) => {
  try {
    const payload = {
      ...req.query,
      ...req.body,
      audio: req.file ? req.file.path : null,
    };

    console.log("Webhook Payload:", payload);

    // Default value if not provided
    if (!payload.evaluatedby) {
      payload.evaluatedby = "";
      payload.useremail= "";
    }

    // Save to DB
    const doc = await Escalation.create(payload);

    res.status(201).json({
      success: true,
      message: "Escalation saved",
      data: doc,
    });
  } catch (err) {
    console.error("Webhook error:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});



const getEscalations = AsyncHandler(async (req, res) => {
  try {
    const escalations = await Escalation.find().populate("owner", "name email");
    res.json({ success: true, data: escalations });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});


const getEscalationById = AsyncHandler(async (req, res) => {
  const doc = await Escalation.findById(req.params.id);
  if (!doc) return res.status(404).json({ success: false, message: "Not found" });
  res.json({ success: true, data: doc });
});

const getAgentName = AsyncHandler(async (req, res) => {
  try {
    const { agentEmail } = req.params; 
    const { by = 'agentName' } = req.query; 
    
    if (!agentEmail) {
      return res.status(400).json({ 
        success: false, 
        message: "Agent email is required" 
      });
    }
    
    let query = {};
    if (by === 'agentName') {
      query.agentName = agentEmail;
    } else if (by === 'evaluatedby') {
      query.evaluatedby = agentEmail;
    } else if (by === 'useremail') {
      query.useremail = agentEmail;
    } else {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid 'by' parameter. Use 'agentName' or 'evaluatedby'" 
      });
    }
    
    // Find all escalations matching the query
    const escalations = await Escalation.find(query);
    
    res.json({
      success: true,
      count: escalations.length,
      data: escalations
    });
  } catch (error) {
    console.error("Error fetching agent data:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

const getEscalationByIdBitrix = AsyncHandler(async (req, res) => {
  const { identifier } = req.params;
  const { by } = req.query; 

  let query = {};

  if (by === 'leadID') {
    query = { leadID: identifier };
  } else if (by === 'agentName') {
    query = { agentName: identifier };
  } else if (by === 'evaluatedby') {
    query = { evaluatedby: identifier };  
  } else {
    query = { 
      $or: [
        { _id: identifier },
        { leadID: identifier },
        { evaluatedby: identifier },
        { agentName: identifier }
      ]
    };
  }

  const docs = await Escalation.find(query).populate("owner", "name email");
  
  if (!docs || docs.length === 0) {
    return res.status(404).json({ 
      success: false, 
      message: "No escalations found" 
    });
  }

  res.json({ success: true, data: docs });
});


const updateEscalation = AsyncHandler(async (req, res) => {
  const updateData = { ...req.body };
  if (req.file) updateData.audio = req.file.path;

  const updated = await Escalation.findByIdAndUpdate(req.params.id, updateData, { new: true });
  if (!updated) return res.status(404).json({ success: false, message: "Escalation not found" });

  res.json({ success: true, message: "Escalation updated", data: updated });
});

const deleteEscalation = AsyncHandler(async (req, res) => {
  const deleted = await Escalation.findByIdAndDelete(req.params.id);
  if (!deleted) return res.status(404).json({ success: false, message: "Escalation not found" });
  res.json({ success: true, message: "Escalation deleted" });
});


const totalescalationscounts = AsyncHandler(async (req, res) => {
  const count = await Escalation.countDocuments();
  res.status(200).json({ success: true, count });
});


const datefilterescalation = AsyncHandler(async (req, res) => {
  const { startDate, endDate, agentName, teamleader } = req.query;

  if (!startDate || !endDate) {
    return res.status(400).json({ success: false, message: "Both startDate and endDate are required." });
  }

  const formattedStartDate = new Date(startDate);
  const formattedEndDate = new Date(endDate);
  if (isNaN(formattedStartDate.getTime()) || isNaN(formattedEndDate.getTime())) {
    return res.status(400).json({ success: false, message: "Invalid date format. Use YYYY-MM-DD." });
  }

  const query = {
    createdAt: {
      $gte: new Date(formattedStartDate.setUTCHours(0, 0, 0, 0)),
      $lt: new Date(formattedEndDate.setUTCHours(23, 59, 59, 999)),
    },
  };

  if (teamleader) query.teamleader = { $regex: new RegExp(teamleader, "i") };
  if (agentName) query.agentName = { $regex: new RegExp(agentName, "i") };

  const filteredData = await Escalation.find(query);

  if (!filteredData.length) {
    return res.status(404).json({ success: false, message: "No data found for the selected filters." });
  }

  res.status(200).json({ success: true, data: filteredData });
});

const getEscalationsByOwner = AsyncHandler(async (req, res) => {
  const { ownerId } = req.params;
  const escalation = await Escalation.find({ owner: ownerId });
  res.status(200).json({
    success: true,
    ownerId,
    total: escalation.length,
    data: escalation,
  });
});

const getEscalationsByAgentName = AsyncHandler(async (req, res) => {
  try {
    const { agentName } = req.params;

    // case-insensitive search
    const escalations = await Escalation.find({
      agentName: { $regex: new RegExp(`^${agentName}$`, "i") }
    }).sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: escalations });
  } catch (error) {
    console.error("Error fetching escalations by agentName:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }

});

export {
  createEscalation,
  getEscalations,
  getEscalationById,
  getEscalationByIdBitrix,
  updateEscalation,
  deleteEscalation,
  totalescalationscounts,
  datefilterescalation,
  getEscalationsByOwner,
  getAgentName,
  getEscalationsByAgentName

};
