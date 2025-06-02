const mongoose = require("mongoose")
const escalation = new mongoose.Schema({
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    useremail: {
        type: String,
        required: [true, "Email is required"]
    },
    leadID: {
        type: String,
        required: [true, "Lead ID is required"]
    },
    evaluatedby: {
        type: String,
        required: [true, "Evaluated by is required"]
    },
    agentName: {
        type: String,
        required: [true, "Agent name is required"]
    },
    teamleader: {
        type: String
    },
    leadsource: {
        type: String
    },
    leadstatus: {
        type: String
    },
    escalationseverity:{
        type: String
    },
    issueidentification:{
        type: String
    },
    escalationaction:{
        type:String
    },
    additionalsuccessrmation:{
        type:String
    },
    userrating:{
        type:String
    },
    audio:{
        type:String
    }
},
{timestamps:true}
)

module.exports = mongoose.model('Escalation',escalation)

