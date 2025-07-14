const nodemailer = require('nodemailer');
const config = require('../config/email');

const transporter = nodemailer.createTransport({
    host: 'mail.bicommunications.net',
    port: 465,
    secure: true,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    },
    logger: true,
    debug: true
  });
  

exports.sendPasswordResetEmail = async (email, token) => {
  const resetUrl = `http://localhost:3001/reset-password/${token}`;
  
  const mailOptions = {
    from: config.emailUser,
    to: email,
    subject: 'Password Reset Request',
    html: `
      <p>You requested a password reset</p>
      <p>Click this <a href="${resetUrl}">link</a> to set a new password</p>
      <p>This link will expire in 1 hour.</p>
    `
  };

  await transporter.sendMail(mailOptions);
};