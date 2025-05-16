const mongoose = require("mongoose");

const usersSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, "Please provide an email"],
    unique: [true, "email already exists"],
  },
  password: {
    type: String,
    required: [true, "Please provide a password!"],
    unique: false,
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
