const mongoose = require('mongoose');

const dealSchema = new mongoose.Schema({
  data: Object,
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 60 * 60 * 24 * 7, // 7 days
  },
});

module.exports = mongoose.model('Deal', dealSchema);
