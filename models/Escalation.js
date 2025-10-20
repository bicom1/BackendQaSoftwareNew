import mongoose from "mongoose";

const escalationSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    useremail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    leadID: {
      type: String,
      required: true,
    },
    agentName: {
      type: String,
      required: true,
      trim: true,
    },
    teamleader: {
      type: String,
      required: true,
      trim: true,
    },
    evaluatedby: {
      type: String,
      required: true,
      trim: true,
    },
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
    leadStatus: {
      type: String,
      required: true,
    },
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
    otherAction: {
      type: String,
      trim: true,
      default: "",
    },

   
    isOther: {
      type: Boolean,
      default: false,
    },

    documentation: {
      type: String,
      default: "",
    },
    successmaration: {
      type: String,
      required: true,
      trim: true,
    },
    audio: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Escalation", escalationSchema);
