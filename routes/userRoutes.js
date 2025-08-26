const express = require('express');
const { registerUser, loginUser, findMyProfile, getAllUsers, logout, resetPassword, forgotPassword, totalUserCount } = require('../controllers/userController');
const authMiddleware = require('../middlewares/authMiddleware');
const router = express.Router();

router.post('/register-user',registerUser)
router.post('/login-user', loginUser)
router.post('/forgot-password',forgotPassword);
router.post('/reset-password', resetPassword);


router.get('/my-profile',authMiddleware, findMyProfile)
router.get('/getallusers',authMiddleware, getAllUsers)
router.get("/totalusercount",authMiddleware, totalUserCount);
router.get("/logout",authMiddleware, logout);


module.exports = router;