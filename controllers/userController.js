// controllers/userController.js
const AsyncHandler = require('express-async-handler');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/usermodel');
const { sendPasswordResetEmail } = require('../services/emailService');

// ✅ Consistent token generator
const generateToken = (id, expiresIn = '1d') => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn });
};

// @desc Register
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

  const createUser = await User.create({ name, email, password: hashedPass, role });

  res.json({
    _id: createUser._id,
    name: createUser.name,
    email: createUser.email,
    role: createUser.role,
    token: generateToken(createUser._id),
  });
});

// @desc Login
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

  res.status(200).json({
    success: true,
    token,
    message: 'Login successful',
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  });
});

// @desc Forgot Password (send reset link)
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

// @desc Reset Password
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

// @desc Profile
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


// @desc Get All Users
const getAllUsers = AsyncHandler(async (req, res) => {
  const users = await User.find({}).select('-password');
  res.status(200).json({ success: true, count: users.length, data: users });
});

// @desc Total Count
const totalUserCount = AsyncHandler(async (req, res) => {
  const count = await User.countDocuments();
  res.status(200).json({ success: true, count });
});

// @desc Logout
const logout = (req, res) => {
  try {
    res.clearCookie('token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });
    res.status(200).json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error during logout' });
  }
};

const getUserSubmissionStats = async (req, res) => {
  try {
    const userId = req.user._id; // Authenticated user की ID

    // Aggregation pipeline बनाएं
    const userStats = await User.aggregate([
      {
        $match: { _id: userId } // Current user को filter करें
      },
      {
        $lookup: {
          from: "evaluations", // Evaluation collection
          localField: "_id",
          foreignField: "userId", // Evaluation model में userId field होनी चाहिए
          as: "evaluations"
        }
      },
      {
        $lookup: {
          from: "escalations", // Escalation collection
          localField: "_id",
          foreignField: "userId", // Escalation model में userId field होनी चाहिए
          as: "escalations"
        }
      },
      {
        $project: {
          name: 1,
          email: 1,
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

// सभी users के submission statistics के लिए function
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
        $sort: { totalSubmissions: -1 } // सबसे ज्यादा submissions वाले users पहले
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
  getAllUsers,
  totalUserCount,
  logout,
  getUserSubmissionStats,
  getAllUsersSubmissionStats
};
