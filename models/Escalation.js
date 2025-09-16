const mongoose = require("mongoose");


const escalationSchema = new mongoose.Schema(
{
owner: {
type: mongoose.Schema.Types.ObjectId,
ref: "User",
required: false,
},
useremail: {
type: String,
required: [false, "Email is required"],
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
required: [false, "Agent name is required"],
},
teamleader: {
type: String,
},
leadsource: {
type: String,
},
leadStatus: {
type: String,
},
escSeverity: {
type: String,
},
issueIden: {
type: String,
},
escAction: {
type: String,
},
documentation: {
type: String,
},
successmaration: {
type: String,
},
userrating: {
type: String,
},
audio: {
type: String,
},
},
{ timestamps: true }
);


module.exports = mongoose.model("Escalation", escalationSchema);