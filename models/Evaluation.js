const mongoose = require("mongoose");

const evaluationSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    useremail: {
      type: String,
      required: [false, "field is require"],
    },
    leadID: {
      type: Number,
      required: [false, "Lead ID is required"],
      validate: {
        validator: Number.isInteger,
        message: "{VALUE} is not an integer value"
    }
   },
evaluatedby: {
type: String,
required: [false, "Evaluated by is required"],
},
    agentName: {
      type: String,
      required: [false, "field is require"],
    },
    mod: {
      type: String,
      required: [false, "field is require"],
    },
    teamleader: {
      type: String,
      required: [false, "field is require"],
    },
    greetings: {
      type: String,
    },
    accuracy: {
      type: String,
    },
    building: {
      type: String,
    },
    presenting: {
      type: String,
    },
    closing: {
      type: String,
    },
    bonus: {
      type: String,
    },
    evaluationsummary: {
      type: String,
    },
    rating: {             
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['draft', 'published', 'archived'],
      default: 'draft'
    },
    submissionSource: {
      type: String,
      enum: ['frontend', 'bitrix'],
      default: 'frontend' 
    },
    publishedAt: {
      type: Date
    },
    bitrixSubmitted: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.models.Evaluation || mongoose.model("Evaluation", evaluationSchema);

