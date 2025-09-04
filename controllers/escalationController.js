import express from 'express';
import mongoose from 'mongoose';
import AsyncHandler from 'express-async-handler';
import Escalation from '../models/Escalation.js';

// Create Escalation
const createEscalation = AsyncHandler(async (req, res) => {
  try {
    const payload = {
      ...req.body,
      audio: req.file ? req.file.path : null,
    };
    if (!payload.evaluatedby) {
      return res.status(400).json({ success: false, message: "Evaluated by is required" });
    }

    const doc = await Escalation.create(payload);

    return res.status(201).json({
      success: true,
      message: "Escalation saved",
      data: doc,
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

// Get All Escalations
const getEscalations = AsyncHandler(async (req, res) => {
  try {
    const escalations = await Escalation.find().populate("owner", "name email");
    return res.json({ success: true, data: escalations });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// Get Escalation by ID
const getEscalationById = AsyncHandler(async (req, res) => {
  try {
    const doc = await Escalation.findById(req.params.id).populate("owner", "name email");
    if (!doc) return res.status(404).json({ success: false, message: "Escalation not found" });
    return res.json({ success: true, data: doc });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// Update Escalation
const updateEscalation = AsyncHandler(async (req, res) => {
  try {
    const updateData = { ...req.body };
    if (req.file) updateData.audio = req.file.path;

    const updated = await Escalation.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!updated) return res.status(404).json({ success: false, message: "Escalation not found" });

    return res.json({ success: true, message: "Escalation updated", data: updated });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

// Delete Escalation
const deleteEscalation = AsyncHandler(async (req, res) => {
  try {
    const deleted = await Escalation.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, message: "Escalation not found" });
    return res.json({ success: true, message: "Escalation deleted" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// First declare the function
const totalescalationscounts = AsyncHandler(async (req, res) => {
  try {
    const count = await Escalation.countDocuments();
    res.status(200).json({ success: true, count });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: "Error counting escalations",
      error: error.message 
    });
  }
});


const datefilterescalation = async (req, res) => {
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
        message: "No data found for the selected filters.",
      });
    }

    res.status(200).json({
      success: true,
      data: filteredData,
    });
  } catch (error) {
    console.error("Error in datefilterescalation:", error);
    res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
    });
  }
};

export const getEscalationsByOwner = async (req, res) => {
  try {
    const { ownerId } = req.params;

    const escalation = await Escalation.find({ owner: ownerId });

    res.status(200).json({
      success: true,
      ownerId,
      total: escalation.length,
      data: escalation,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};




export {
  createEscalation,
  getEscalations,
  getEscalationById,
  updateEscalation,
  deleteEscalation,
  totalescalationscounts,
  datefilterescalation
};
