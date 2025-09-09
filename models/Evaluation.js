const mongoose = require("mongoose");

const evaluationSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    useremail: {
      type: String,
      required: [true, "field is require"],
    },
    leadID: {
      type: Number,
      required: [true, "Lead ID is required"],
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
      required: [true, "field is require"],
    },
    mod: {
      type: String,
      required: [true, "field is require"],
    },
    teamleader: {
      type: String,
      required: [true, "field is require"],
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
    rating: {             // added rating field
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.models.Evaluation || mongoose.model("Evaluation", evaluationSchema);

