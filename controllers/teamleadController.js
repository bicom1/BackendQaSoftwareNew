const TeamLeader = require('../models/TeamLeader');
const bcrypt = require('bcryptjs');

// CREATE
const addLeader = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    const existing = await TeamLeader.findOne({ email });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newLeader = new TeamLeader({
      name,
      email,
      password: hashedPassword
    });

    await newLeader.save();

    res.status(201).json({
      success: true,
      message: 'Team leader created',
      data: {
        id: newLeader._id,
        name: newLeader.name,
        email: newLeader.email
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};


const getAllLeaders = async (req, res) => {
  try {
    const leaders = await TeamLeader.find().select('-password'); // exclude password
    res.json({ success: true, data: leaders });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};


const getLeaderById = async (req, res) => {
  try {
    const leader = await TeamLeader.findById(req.params.id).select('-password');
    if (!leader) {
      return res.status(404).json({ success: false, message: 'Leader not found' });
    }
    res.json({ success: true, data: leader });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};


const updateLeader = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const leader = await TeamLeader.findById(req.params.id);
    if (!leader) {
      return res.status(404).json({ success: false, message: 'Leader not found' });
    }

    if (name) leader.name = name;
    if (email) leader.email = email;
    if (password) {
      leader.password = await bcrypt.hash(password, 10);
    }

    await leader.save();

    res.json({
      success: true,
      message: 'Team leader updated',
      data: {
        id: leader._id,
        name: leader.name,
        email: leader.email
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};


const deleteLeader = async (req, res) => {
  try {
    const leader = await TeamLeader.findByIdAndDelete(req.params.id);
    if (!leader) {
      return res.status(404).json({ success: false, message: 'Leader not found' });
    }
    res.json({ success: true, message: 'Team leader deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

module.exports = {
  addLeader,
  getAllLeaders,
  getLeaderById,
  updateLeader,
  deleteLeader
};
