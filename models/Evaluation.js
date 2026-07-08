const mongoose = require("mongoose");

// ✅ Reusable sub-schema for each evaluation field
const criteriaSchema = new mongoose.Schema(
  {
    value: {
      type: String,
      default: null, // can now accept any string value
    },
    reason: {
      type: String,
      default: null, // can now accept any string value
    },
    comment: {
      type: String,
      default: "",
    },
    points: {
      type: Number,
      default: 0,
    },
  },
  { _id: false }
);

// ✅ Main Evaluation Schema
const evaluationSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    useremail: {
      type: String,
      required: false,
    },
    leadID: {
      type: Number,
      validate: {
        validator: Number.isInteger,
        message: "{VALUE} is not an integer value",
      },
    },
    agentName: {
      type: String,
      required: false,
    },
    mod: {
      type: String,
      required: false,
    },
    teamleader: {
      type: String,
      required: false,
    },

    // ✅ Criteria sections (each supports nested objects)
    greetings: criteriaSchema,
    responsetime: criteriaSchema,
    accuracy: criteriaSchema,
    building: criteriaSchema,
    presenting: criteriaSchema,
    closing: criteriaSchema,
    bonus: criteriaSchema,

    evaluationsummary: {
      type: String,
      default: "",
    },
    rating: {
      type: Number,
      default: 0,
    },
    submittedByRole: {
      type: String,
      default: "",
    },
    teamLeadReview: {
      required: { type: Boolean, default: false },
      status: {
        type: String,
        enum: ["pending", "awaiting_qc_response", "discussed", "resolved"],
        default: "pending",
      },
      routedAt: { type: Date },
      teamLeaderName: { type: String, default: "" },
      teamLeaderEmail: { type: String, default: "" },
      lowScoreThreshold: { type: Number, default: 40 },
      threads: [
        {
          question: { type: String, required: true, trim: true },
          askedByName: { type: String, default: "" },
          askedByEmail: { type: String, default: "" },
          askedAt: { type: Date, default: Date.now },
          answer: { type: String, default: "" },
          answeredByName: { type: String, default: "" },
          answeredByEmail: { type: String, default: "" },
          answeredAt: { type: Date },
        },
      ],
    },
    flaggedReview: {
      required: { type: Boolean, default: false },
      flaggedAt: { type: Date },
      issueSummary: { type: String, default: "" },
      status: {
        type: String,
        enum: ["pending", "forwarded_to_qc", "approved", "rejected"],
        default: "pending",
      },
      forwardedAt: { type: Date },
      forwardedByName: { type: String, default: "" },
      forwardedByEmail: { type: String, default: "" },
      qcNote: { type: String, default: "" },
      qcResolvedAt: { type: Date },
      qcResolvedByName: { type: String, default: "" },
      qcResolvedByEmail: { type: String, default: "" },
    },
    status: {
      type: String,
      enum: ["published"],
      default: "published",
    },
    submissionSource: {
      type: String,
      enum: ["frontend", "bitrix"],
      default: "frontend",
    },
    publishedAt: {
      type: Date,
    },
    bitrixSubmitted: {
      type: Boolean,
      default: true,
    },
    audio: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.Evaluation || mongoose.model("Evaluation", evaluationSchema);
