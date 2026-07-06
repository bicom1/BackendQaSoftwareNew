const mongoose = require("mongoose");

// User schema stores auth credentials, presence, and simple session metadata

const usersSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, "Please provide an email"],
      unique: [true, "email already exists"],
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, "Please provide a password!"],
      minlength: 8,
      select: false,
    },
    name: {
      type: String,
    },
    role: {
      type: String,
      enum: [
        "admin",
        "superadmin",
        "user",
        "agent_user",
        "agent_admin",
        "qc_admin",
        "qc_user",
      ],
      required: [true, "Role is required"],
    },
    isOnline: {
      type: Boolean,
      default: false,
    },
    lastActive: {
      type: Date,
      default: Date.now,
    },
    socketId: {
      type: String,
      default: null,
    },
    loginCount: {
      type: Number,
      default: 0,
    },
    currentSession: {
      token: String,
      expiresAt: Date,
      ipAddress: String,
      userAgent: String,
    },
    status: {
      type: String,
      enum: ["online", "offline", "away", "busy"],
      default: "offline",
    },
    invitePending: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Index for better query performance
usersSchema.index({ isOnline: 1 });
usersSchema.index({ lastActive: 1 });
usersSchema.index({ status: 1 });

// Method to update user activity
usersSchema.methods.updateActivity = function () {
  this.lastActive = new Date();
  return this.save();
};

// Method to set user online
usersSchema.methods.setOnline = function (socketId = null) {
  this.isOnline = true;
  this.status = "online";
  this.lastActive = new Date();
  if (socketId) this.socketId = socketId;
  return this.save();
};

// Method to set user offline
usersSchema.methods.setOffline = function () {
  this.isOnline = false;
  this.status = "offline";
  this.socketId = null;
  return this.save();
};

module.exports = mongoose.model("User", usersSchema);
