// controllers/userController.js
const AsyncHandler = require('express-async-handler');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/usermodel');
const { sendPasswordResetEmail } = require('../services/emailService');


const generateToken = (id, expiresIn = '1d') => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn });
};


const registerUser = AsyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password || !role) {
    res.status(400);
    throw new Error('Please fill in all fields');
  }

  const checkUser = await User.findOne({ email });
  if (checkUser) {
    res.status(400);
    throw new Error('Email already exists');
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPass = await bcrypt.hash(password, salt);

  const createUser = await User.create({ 
    name, 
    email, 
    password: hashedPass, 
    role,
    loginCount: 1 // Initialize login count
  });

  // Set user online after registration
  await createUser.setOnline();

  res.json({
    _id: createUser._id,
    name: createUser.name,
    email: createUser.email,
    role: createUser.role,
    isOnline: createUser.isOnline,
    status: createUser.status,
    token: generateToken(createUser._id),
  });
});


const loginUser = AsyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select('+password');
  if (!user) {
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  }

  const token = generateToken(user._id);
  
  // Update user status and increment login count
  user.loginCount += 1;
  await user.setOnline();

  res.status(200).json({
    success: true,
    token,
    message: 'Login successful',
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isOnline: user.isOnline,
      status: user.status,
      lastActive: user.lastActive,
      loginCount: user.loginCount
    },
  });
});


const forgotPassword = AsyncHandler(async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });

  if (!user) {
    return res.status(200).json({ message: 'If an account exists, a reset link has been sent' });
  }

  // Generate reset token (JWT valid for 15m)
  const resetToken = generateToken(user._id, '15m');
  const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

  await sendPasswordResetEmail(user.email, resetLink);

  res.status(200).json({ message: 'If an account exists, a reset link has been sent' });
});


const resetPassword = AsyncHandler(async (req, res) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    return res.status(400).json({ message: 'Token and new password are required' });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ message: 'Password must be at least 8 characters long' });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return res.status(400).json({ message: 'Invalid or expired reset token' });
  }

  const user = await User.findById(decoded.id);
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  const isSamePassword = await bcrypt.compare(newPassword, user.password);
  if (isSamePassword) {
    return res.status(400).json({ message: 'New password must be different from current password' });
  }

  user.password = await bcrypt.hash(newPassword, 12);
  await user.save();

  res.status(200).json({ success: true, message: 'Password updated successfully' });
});


const findMyProfile = AsyncHandler(async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authorized, token failed' });
  }

  const foundUser = await User.findById(req.user._id).select('-password');
  if (!foundUser) {
    res.status(404);
    throw new Error('User not found');
  }

  res.status(200).json(foundUser);
});


const updateUserStatus = AsyncHandler(async (req, res) => {
  const { status } = req.body;
  
  if (!['online', 'offline', 'away', 'busy'].includes(status)) {
    return res.status(400).json({ message: 'Invalid status value' });
  }

  const user = await User.findById(req.user._id);
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  user.status = status;
  if (status === 'offline') {
    user.isOnline = false;
    user.socketId = null;
  } else if (status === 'online') {
    user.isOnline = true;
  }
  
  await user.save();
  
  res.status(200).json({
    success: true,
    message: 'Status updated successfully',
    user: {
      _id: user._id,
      status: user.status,
      isOnline: user.isOnline
    }
  });
});


const updateUserActivity = AsyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  await user.updateActivity();
  
  res.status(200).json({
    success: true,
    message: 'Activity updated successfully',
    lastActive: user.lastActive
  });
});


const setUserOnline = AsyncHandler(async (req, res) => {
  const { socketId } = req.body;
  const user = await User.findById(req.user._id);
  
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  await user.setOnline(socketId);
  
  res.status(200).json({
    success: true,
    message: 'User is now online',
    user: {
      _id: user._id,
      isOnline: user.isOnline,
      status: user.status,
      socketId: user.socketId,
      lastActive: user.lastActive
    }
  });
});


const setUserOffline = AsyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  await user.setOffline();
  
  res.status(200).json({
    success: true,
    message: 'User is now offline',
    user: {
      _id: user._id,
      isOnline: user.isOnline,
      status: user.status,
      socketId: user.socketId
    }
  });
});


const getAllUsers = AsyncHandler(async (req, res) => {
  const users = await User.find({}).select('-password');
  res.status(200).json({ success: true, count: users.length, data: users });
});

const getOnlineUsers = AsyncHandler(async (req, res) => {
  const onlineUsers = await User.find({ isOnline: true }).select('name email status lastActive');
  res.status(200).json({ success: true, count: onlineUsers.length, data: onlineUsers });
});



const totalUserCount = AsyncHandler(async (req, res) => {
  const count = await User.countDocuments();
  res.status(200).json({ success: true, count });
});

const onlineUserCount = AsyncHandler(async (req, res) => {
  const count = await User.countDocuments({ isOnline: true });
  res.status(200).json({ success: true, count });
});


const logout = AsyncHandler(async (req, res) => {
  try {
    // Set user offline before logging out
    const user = await User.findById(req.user._id);
    if (user) {
      await user.setOffline();
    }

    res.clearCookie('token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });
    
    res.status(200).json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error during logout' });
  }
});

const getUserSubmissionStats = async (req, res) => {
  try {
    const userId = req.user._id;

    const userStats = await User.aggregate([
      {
        $match: { _id: userId }
      },
      {
        $lookup: {
          from: "evaluations",
          localField: "_id",
          foreignField: "userId",
          as: "evaluations"
        }
      },
      {
        $lookup: {
          from: "escalations",
          localField: "_id",
          foreignField: "userId",
          as: "escalations"
        }
      },
      {
        $project: {
          name: 1,
          email: 1,
          isOnline: 1,
          status: 1,
          lastActive: 1,
          loginCount: 1,
          evaluationCount: { $size: "$evaluations" },
          escalationCount: { $size: "$escalations" },
          totalSubmissions: { 
            $add: [
              { $size: "$evaluations" },
              { $size: "$escalations" }
            ]
          }
        }
      }
    ]);

    if (userStats.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    res.status(200).json({
      success: true,
      data: userStats[0]
    });
  } catch (error) {
    console.error("Error fetching user submission stats:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};


const getAllUsersSubmissionStats = async (req, res) => {
  try {
    const usersStats = await User.aggregate([
      {
        $lookup: {
          from: "evaluations",
          localField: "_id",
          foreignField: "userId",
          as: "evaluations"
        }
      },
      {
        $lookup: {
          from: "escalations",
          localField: "_id",
          foreignField: "userId",
          as: "escalations"
        }
      },
      {
        $project: {
          name: 1,
          email: 1,
          role: 1,
          isOnline: 1,
          status: 1,
          lastActive: 1,
          loginCount: 1,
          evaluationCount: { $size: "$evaluations" },
          escalationCount: { $size: "$escalations" },
          totalSubmissions: { 
            $add: [
              { $size: "$evaluations" },
              { $size: "$escalations" }
            ]
          }
        }
      },
      {
        $sort: { totalSubmissions: -1 }
      }
    ]);

    res.status(200).json({
      success: true,
      data: usersStats,
      totalUsers: usersStats.length
    });
  } catch (error) {
    console.error("Error fetching all users submission stats:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  registerUser,
  loginUser,
  forgotPassword,
  resetPassword,
  findMyProfile,
  updateUserStatus,
  updateUserActivity,
  setUserOnline,
  setUserOffline,
  getAllUsers,
  getOnlineUsers,
  totalUserCount,
  onlineUserCount,
  logout,
  getUserSubmissionStats,
  getAllUsersSubmissionStats
};