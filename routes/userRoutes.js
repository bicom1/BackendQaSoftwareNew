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

// User status management routes
router.put("/update-user/:id", authMiddleware, updateUser);
router.put("/update-status", authMiddleware, updateUserStatus);
router.put("/update-activity", authMiddleware, updateUserActivity);
router.put("/set-online", authMiddleware, setUserOnline);
router.put("/set-offline", authMiddleware, setUserOffline);

router.patch("/patch/:id", authMiddleware, patchUser);
router.delete("/delete/:id", authMiddleware, deleteUser);

module.exports = router;
