// models/Lead.js
const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema({
  data: Object,         // The lead data from Bitrix
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 60 * 60 * 24 * 7, // TTL: 7 days in seconds
  }
});

module.exports = mongoose.model('Lead', leadSchema);
