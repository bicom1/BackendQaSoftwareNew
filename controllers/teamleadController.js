const TeamLeader = require("../models/TeamLeader");

const addLeader = async (req, res) => {
  try {
    const { name, email, department } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: "Name is required" });
    }
    if (!email) {
      return res.status(400).json({ success: false, message: "Email is required" });
    }
    if (!department) {
      return res.status(400).json({ success: false, message: "Department is required" });
    }

    const newLeader = new TeamLeader({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      department: department.trim(),
    });

    await newLeader.save();

    res.status(201).json({
      success: true,
      message: "Team leader created",
      data: newLeader,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
};

const getAllLeaders = async (req, res) => {
  try {
    const leaders = await TeamLeader.find().sort({ createdAt: -1 });
    res.json({ success: true, data: leaders });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
};

const getLeaderById = async (req, res) => {
  try {
    const leader = await TeamLeader.findById(req.params.id);
    if (!leader) {
      return res.status(404).json({ success: false, message: "Leader not found" });
    }
    res.json({ success: true, data: leader });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
};

const updateLeader = async (req, res) => {
  try {
    const { name, email, department } = req.body;

    const leader = await TeamLeader.findById(req.params.id);
    if (!leader) {
      return res.status(404).json({ success: false, message: "Leader not found" });
    }

    if (name) leader.name = name.trim();
    if (email) leader.email = email.trim().toLowerCase();
    if (department) leader.department = department.trim();

    await leader.save();

    res.json({
      success: true,
      message: "Team leader updated",
      data: leader,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
};

const deleteLeader = async (req, res) => {
  try {
    const leader = await TeamLeader.findByIdAndDelete(req.params.id);
    if (!leader) {
      return res.status(404).json({ success: false, message: "Leader not found" });
    }
    res.json({ success: true, message: "Team leader deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
};

module.exports = {
  addLeader,
  getAllLeaders,
  getLeaderById,
  updateLeader,
  deleteLeader,
};
