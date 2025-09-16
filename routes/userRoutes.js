const express = require('express');
const { 
  registerUser, 
  loginUser, 
  findMyProfile, 
  getAllUsers, 
  logout, 
  resetPassword, 
  forgotPassword, 
  totalUserCount, 
  getUserSubmissionStats, 
  getAllUsersSubmissionStats,
  updateUserStatus,
  updateUserActivity,
  setUserOnline,
  setUserOffline,
  getOnlineUsers,
  onlineUserCount,
} = require('../controllers/userController');
const authMiddleware = require('../middlewares/authMiddleware');
const router = express.Router();

// Public routes
router.post('/register-user', registerUser);
router.post('/login-user', loginUser);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// Protected routes 
router.get('/my-profile', authMiddleware, findMyProfile);
router.get('/getallusers', authMiddleware, getAllUsers);
router.get("/totalusercount", authMiddleware, totalUserCount);
router.get("/logout", authMiddleware, logout);
router.get("/user-submission-stats", authMiddleware, getUserSubmissionStats);
router.get("/all-users-stats", authMiddleware, getAllUsersSubmissionStats);
router.get("/online-users", authMiddleware, getOnlineUsers);
router.get("/online-users-count", authMiddleware, onlineUserCount);

// User status management routes
router.put('/update-status', authMiddleware, updateUserStatus);
router.put('/update-activity', authMiddleware, updateUserActivity);
router.put('/set-online', authMiddleware, setUserOnline);
router.put('/set-offline', authMiddleware, setUserOffline);

module.exports = router;