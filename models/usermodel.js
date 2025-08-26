const mongoose = require("mongoose");

const usersSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, "Please provide an email"],
    unique: [true, "email already exists"],
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: [true, "Please provide a password!"],
    minlength: 8,
    select: false
  },
  name: {
    type: String,
  },
  role: {
    type: String,
  },
},{
    timestamps: true,
});



module.exports = mongoose.model("User", usersSchema);


