const AsyncHandler = require('express-async-handler');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/usermodel');
const Token = require('../models/Token');

const {
  generateResetToken,
  saveToken,
  validateToken,
  generateAuthToken
} = require('../services/tokenService');

const { sendPasswordResetEmail } = require('../services/emailService');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '1d' });
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

  const createUser = await User.create({ name, email, password: hashedPass, role });

  res.json({
    _id: createUser._id,
    name: createUser.name,
    email: createUser.email,
    password: createUser.password,
    role: createUser.role,
    token: generateToken(createUser._id)
  });
});



const loginUser = AsyncHandler(async (req, res) => {
    const { email, password } = req.body;
  
    try {
     
      const user = await User.findOne({ email }).select('+password');
      if (!user) {
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
      }
  
    
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
      }
  
    
      const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
        expiresIn: '1d',
      });
  
      
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
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  });
  


const forgotPassword = AsyncHandler(async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });

  if (!user) {
    return res.status(200).json({ message: 'If an account exists, a reset link has been sent' });
  }

  const token = generateResetToken();
  await saveToken(user._id, token);
  await sendPasswordResetEmail(user.email, token);

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

  const tokenDoc = await validateToken(token);
  if (!tokenDoc) {
    return res.status(400).json({ message: 'Invalid or expired token. Please request a new password reset.' });
  }

  const user = await User.findById(tokenDoc.userId);
  if (!user) {
    await Token.findByIdAndDelete(tokenDoc._id);
    return res.status(404).json({ message: 'User not found' });
  }

  const isSamePassword = await bcrypt.compare(newPassword, user.password);
  if (isSamePassword) {
    return res.status(400).json({ message: 'New password must be different from current password' });
  }

  user.password = await bcrypt.hash(newPassword, 12);
  await user.save();
  await Token.deleteMany({ userId: user._id });

  res.status(200).json({ success: true, message: 'Password updated successfully' });
});


const findMyProfile = AsyncHandler(async (req, res) => {
  const userId = req.user.id; // From JWT token (authMiddleware)
  const foundUser = await User.findById(userId).select("-password");
  
  if (!foundUser) {
    res.status(404);
    throw new Error("User not found");
  }

  res.status(200).json(foundUser);
});



const getAllUsers = AsyncHandler(async (req, res) => {
  const users = await User.find({}).select('-password');
  res.status(200).json({
    success: true,
    count: users.length,
    data: users
  });
});

const totalUserCount = AsyncHandler(async(req,res)=>{
  const count = await User.countDocuments();
  res.status(200).json({success:true,count})
})


const logout = (req, res) => {
  try {
    res.clearCookie('token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });

    res.status(200).json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error during logout' });
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
  logout
};
