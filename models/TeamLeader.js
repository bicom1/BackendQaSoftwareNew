const mongoose = require("mongoose");

const teamLeaderSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    match: [/^[A-Za-z\s]+$/, "Name should only contain alphabets"],
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    default: "",
  },
  department: {
    type: String,
    trim: true,
    default: "",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("TeamLeader", teamLeaderSchema);
