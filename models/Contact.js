const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema({
  data: Object,
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 60 * 60 * 24 * 7, // 7 days
  },
});

module.exports = mongoose.model('Contact', contactSchema);
