// models/Escalation.js
const mongoose = require('mongoose');

const escalationSchema = new mongoose.Schema({
  owner: {
    type: String,
    trim: true,
    default: ""
  },
  useremail: {
    type: String,
    required: [true, 'Reporter email is required'],
    trim: true,
    lowercase: true,
    
  },
  leadID: {
    type: String,
    required: [true, 'Lead ID is required'],
    trim: true,
    uppercase: true,
   
  },
  agentName: {
    type: String,
    required: [true, 'Agent Name is required'],
    trim: true
  },
  teamleader: {
    type: String,
    required: [true, 'Team Leader is required'],
    trim: true
  },
  evaluatedBy: {
    type: String,
    required: [true, 'Evaluated By name is required'],
    trim: true
  },
  leadSource: {
    type: String,
    required: [true, 'Lead Source is required'],
    enum: {
      values: ["Facebook", "Instagram", "Live chat", "Call", "WhatsApp", "PPC"],
      message: '{VALUE} is not a valid lead source.'
    }
  },
  userrating: {
    type: String,
    required: [true, 'User rating is required'],
    enum: {
      values: ["good", "average", "bad"],
      message: '{VALUE} is not a valid user rating.'
    }
  },
  leadStatus: {
    type: String,
    required: [true, 'Lead Status is required'],
    trim: true,
   
  },
  escSeverity: {
  type: String,
  required: [true, 'Escalation Severity is required'],
  enum: ["Urgent Action required", "High", "Repeated"],
  set: val => val.charAt(0).toUpperCase() + val.slice(1).toLowerCase() // capitalizes first letter
},

  issueIden: {
    type: String,
    required: [true, 'Issue Identification is required'],
    enum: {
      values: ["Product Knowledge", "Sales Process", "Communication", "Customer Focus", "SOP's"],
      message: '{VALUE} is not a valid issue identification.'
    }
  },
  escAction: {
    type: String,
    required: [true, 'Escalation Action is required'],
    trim: true
  },
  documentation: {
    type: String,
    required: [true, 'Documentation status is required'],
    enum: {
      values: ["provided", "mark"],
      message: '{VALUE} is not a valid documentation status.'
    }
  },
  successmaration: { // This is the field name in your schema
    type: String,
    required: [true, 'Additional information is required'],
    trim: true,
    
  },
  audio: {
    type: String, 
    default: null,
    trim: true
  },
}, {
  timestamps: true 
});

module.exports = mongoose.model('Escalation', escalationSchema);