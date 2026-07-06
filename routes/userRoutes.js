const express = require("express");
const {
  forgotPassword,
  verifyOtp,
  resetPassword,
} = require("../controllers/passwordResetController");
const {
  forgotPasswordLimiter,
  verifyOtpLimiter,
  resetPasswordLimiter,
  signupLimiter,
} = require("../middlewares/rateLimiters");
const {
  registerUser,
  signupUser,
  loginUser,
  findMyProfile,
  getAllUsers,
  logout,
  totalUserCount,
  getUserSubmissionStats,
  getAllUsersSubmissionStats,
  updateUserStatus,
  updateUserActivity,
  setUserOnline,
  setUserOffline,
  getOnlineUsers,
  getUsersByPresence,
  onlineUserCount,
  getUserById,
  patchUser,
  deleteUser,
  updateUser,
} = require("../controllers/userController");
const authMiddleware = require("../middlewares/authMiddleware");
const optionalRegisterAuth = require("../middlewares/optionalRegisterAuth");
const {
  invitedUsersCount,
  getInvitedUsers,
  sendInvite,
  resendInvite,
  deleteInvite,
  validateInviteToken,
  acceptInvite,
} = require("../controllers/inviteController");
const router = express.Router();

// Public routes
router.post("/signup", signupLimiter, signupUser);
router.post("/register-user", optionalRegisterAuth, registerUser);
router.post("/login-user", loginUser);
router.post("/forgot-password", forgotPasswordLimiter, forgotPassword);
router.post("/verify-otp", verifyOtpLimiter, verifyOtp);
router.post("/reset-password", resetPasswordLimiter, resetPassword);

// Protected routes
router.get("/get-user/:id", authMiddleware, getUserById);
router.get("/my-profile", authMiddleware, findMyProfile);
router.get("/getallusers", authMiddleware, getAllUsers);
router.get("/totalusercount", authMiddleware, totalUserCount);
router.get("/totalUserCount", authMiddleware, totalUserCount);
router.get("/logout", authMiddleware, logout);
router.get("/user-submission-stats", authMiddleware, getUserSubmissionStats);
router.get("/all-users-stats", authMiddleware, getAllUsersSubmissionStats);
router.get("/online-users", authMiddleware, getOnlineUsers);
router.get("/presence", authMiddleware, getUsersByPresence);
router.get("/online-users-count", authMiddleware, onlineUserCount);

// Invited users (admin managers)
router.get("/invites/count", authMiddleware, invitedUsersCount);
router.get("/invites", authMiddleware, getInvitedUsers);
router.post("/invites", authMiddleware, sendInvite);
router.post("/invites/:inviteId/resend", authMiddleware, resendInvite);
router.delete("/invites/:inviteId", authMiddleware, deleteInvite);

// Public invite accept (after /invites/count and /invites list routes)
router.get("/invites/:token", validateInviteToken);
router.post("/invites/:token/accept", acceptInvite);

// User status management routes
router.put("/update-user/:id", authMiddleware, updateUser);
router.put("/update-status", authMiddleware, updateUserStatus);
router.put("/update-activity", authMiddleware, updateUserActivity);
router.put("/set-online", authMiddleware, setUserOnline);
router.put("/set-offline", authMiddleware, setUserOffline);

router.patch("/patch/:id", authMiddleware, patchUser);
router.delete("/delete/:id", authMiddleware, deleteUser);

module.exports = router;
