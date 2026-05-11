// models/qcEvaluationModel.js
const mongoose = require("mongoose");

const qcEvaluationSchema = new mongoose.Schema(
  {
    qcUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    evaluationType: {
      type: String,
      enum: ["quality", "safety", "compliance", "performance"],
      required: true,
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
      required: true,
    },
    findings: {
      type: String,
      required: true,
    },
    recommendations: String,
    status: {
      type: String,
      enum: ["completed", "pending", "escalated", "resolved"],
      default: "completed",
    },
    escalated: {
      type: Boolean,
      default: false,
    },
    escalationReason: String,
    resolvedAt: Date,
    completionTime: Number,
  },
  { timestamps: true }
);

// Index for better query performance
qcEvaluationSchema.index({ qcUser: 1, createdAt: -1 });
qcEvaluationSchema.index({ status: 1 });

module.exports = mongoose.model("QcEvaluation", qcEvaluationSchema);
