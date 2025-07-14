const express = require('express');
const { registerUser, loginUser, findMyProfile, getAllUsers, logout, resetPassword, forgotPassword, totalUserCount } = require('../controllers/userController');
const authMiddleware = require('../middlewares/authMiddleware');
const router = express.Router();

router.post('/register-user',registerUser)
router.post('/login-user', loginUser)
router.post('/forgot-password',forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/my-profile', authMiddleware, findMyProfile)
router.get('/getallusers', getAllUsers)
router.get("/totalusercount", totalUserCount);
router.get("/logout", logout);


module.exports = router;