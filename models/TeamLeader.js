const mongoose = require('mongoose');

const teamLeaderSchema = new mongoose.Schema({
    name: {
  type: String,
  required: true,
  trim: true,
  match: [/^[A-Za-z\s]+$/, "Name should only contain alphabets"],
},
    email: {
  type: String,
  required: true,
  unique: true,
  match: [/^[a-zA-Z0-9.-]+@gmail\.com$/, "Only Gmail addresses are allowed"],
},
    password: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('TeamLeader', teamLeaderSchema);