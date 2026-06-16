const mongoose = require("mongoose");

const attachmentSchema = new mongoose.Schema(
  {
    filename: String,
    originalName: String,
    mimetype: String,
    size: Number,
    path: String,
  },
  { _id: false }
);

const feedbackSchema = new mongoose.Schema(
  {
    submitterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    submitterName: { type: String, trim: true },
    submitterEmail: { type: String, trim: true, lowercase: true },
    formType: {
      type: String,
      enum: ["evaluation", "escalation"],
      required: true,
    },
    formId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    leadID: { type: String, trim: true },
    agentName: { type: String, trim: true },
    appealMessage: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    attachments: [attachmentSchema],
    status: {
      type: String,
      enum: ["pending", "reviewed", "resolved"],
      default: "pending",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Feedback", feedbackSchema);
