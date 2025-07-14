const mongoose = require("mongoose");

const MarketingSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    leadID: {
      type: String,
      required: [true, "field is required"], 
    },
    teamleader: {
      type: String,
      required: [true, "field is required"],
    },
    branch: {
      type: String,
      required: [true, "field is required"],
    },
    source: {
      type: String,
      required: [true, "field is required"],
    },
    leadQuality: {
      type: String,
      required: [true, "field is required"],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Marketing", MarketingSchema); 