const mongoose = require('mongoose');

const teamLeaderSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        match: [/^[A-Za-z\s]+$/, "Name should only contain alphabets"],
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('TeamLeader', teamLeaderSchema);