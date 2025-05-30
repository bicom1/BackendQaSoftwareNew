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
      type: String,
      required: [true, "field is require"],
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
  },
  { timestamps: true }
);

module.exports = mongoose.model("Evaluation", evaluationSchema);