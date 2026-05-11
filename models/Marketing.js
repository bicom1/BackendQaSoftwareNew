const mongoose = require("mongoose");

const MarketingSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    useremail: {
      type: String,
      required: false,
      lowercase: true,
      trim: true,
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