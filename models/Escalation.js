const mongoose = require("mongoose");

const escalationSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    useremail: { type: String, required: true, lowercase: true, trim: true },
    leadID: { type: String, required: true },
    agentName: { type: String, required: true, trim: true },
    teamleader: { type: String, required: true, trim: true },
    evaluatedby: { type: String, required: true, trim: true },
    leadSource: {
      type: String,
      required: true,
      enum: [
        "Facebook",
        "Instagram",
        "Live chat",
        "Call",
        "WhatsApp",
        "PPC",
        "SnapChat",
        "TikTok",
        "SEO",
      ],
    },
    userrating: {
      type: String,
      required: true,
      enum: ["good", "average", "bad"],
    },
    leadStatus: { type: String, required: true },
    escSeverity: {
      type: String,
      required: true,
      enum: ["Urgent Action required", "High", "Repeated"],
    },
    issueIden: {
      type: String,
      required: true,
      enum: [
        "Product Knowledge",
        "Sales Process",
        "Communication",
        "Customer Focus",
        "Other",
      ],
    },
    escAction: {
      type: String,
      required: true,
      enum: [
        "Coaching Required",
        "Additional Training",
        "Policy Violation",
        "Other",
      ],
    },
    otherAction: { type: String, trim: true, default: "" },
    isOther: { type: Boolean, default: false },
    documentation: { type: String, default: "" },
    successmaration: { type: String, required: true, trim: true },
    audio: { type: String, default: null },

    // Draft/Published workflow (used by QC dashboards)
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
    publishedAt: { type: Date },
    bitrixSubmitted: { type: Boolean, default: false },
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
      lowScoreThreshold: { type: mongoose.Schema.Types.Mixed, default: 40 },
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
  },
  { timestamps: true }
);

module.exports = mongoose.model("Escalation", escalationSchema);
