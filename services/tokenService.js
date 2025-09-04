// const crypto = require('crypto');
// const jwt = require('jsonwebtoken');
// const Token = require('../models/Token');

// // Generate JWT Auth Token
// const generateAuthToken = (userId) => {
//   return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
// };

// // Generate password reset token
// const generateResetToken = () => {
//   return crypto.randomBytes(32).toString('hex');
// };

// // Save token to DB
// const saveToken = async (userId, token) => {
//   await Token.findOneAndDelete({ userId });
//   const newToken = new Token({ userId, token });
//   await newToken.save();
// };

// // Validate reset token
// const validateToken = async (token) => {
//   const tokenDoc = await Token.findOne({ token });
//   return tokenDoc;
// };

// module.exports = {
//   generateAuthToken,
//   generateResetToken,
//   generateVerificationToken: generateResetToken,
//   saveToken,
//   validateToken
// };
