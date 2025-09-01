const mongoose = require("mongoose");


const escalationSchema = new mongoose.Schema(
{
owner: {
type: mongoose.Schema.Types.ObjectId,
ref: "User",
required: true,
},
useremail: {
type: String,
required: [true, "Email is required"],
},
leadID: {
type: String,
required: [true, "Lead ID is required"],
},
evaluatedby: {
type: String,
required: [true, "Evaluated by is required"],
},
agentName: {
type: String,
required: [true, "Agent name is required"],
},
teamleader: {
type: String,
},
leadSource: {
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