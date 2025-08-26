const jwt = require('jsonwebtoken');
const AsyncHandler = require('express-async-handler');
const User = require('../models/usermodel');

const authMiddleware = AsyncHandler(async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Use only decoded.id since that's what you're signing with
      const userId = decoded.id;
      if (!userId) {
        res.status(401);
        throw new Error('Invalid token payload');
      }

      req.user = await User.findById(userId).select('-password');

      if (!req.user) {
        res.status(401);
        throw new Error('User not found');
      }

      next();
    } catch (error) {
      console.error('Auth Error:', error.message);
      res.status(401);
      throw new Error('Invalid or expired token');
    }
  } else {
    res.status(401);
    throw new Error('No token provided');
  }
});

module.exports = authMiddleware;
