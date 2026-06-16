const AsyncHandler = require("express-async-handler");
const User = require("../models/usermodel");
const { sendOtpEmail } = require("../services/emailService");
const otpService = require("../services/otpService");
const { hashPassword, comparePassword } = require("../helpers/password");

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const normalizeEmail = (email) => email.trim().toLowerCase();

const handleServiceError = (res, err) => {
  const status = err.statusCode || 500;
  const code = err.code || "INTERNAL_ERROR";

  if (status >= 500) {
    console.error(`[password-reset:${code}]`, err.message);
  }

  return res.status(status).json({
    success: false,
    code,
    message: err.message || "Something went wrong",
  });
};

/**
 * POST /api/users/forgot-password
 * Body: { email }
 */
const forgotPassword = AsyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email?.trim()) {
    return res.status(400).json({
      success: false,
      code: "EMAIL_REQUIRED",
      message: "Email is required",
    });
  }

  const normalizedEmail = normalizeEmail(email);

  if (!EMAIL_REGEX.test(normalizedEmail)) {
    return res.status(400).json({
      success: false,
      code: "INVALID_EMAIL",
      message: "Invalid email format",
    });
  }

  const user = await User.findOne({ email: normalizedEmail });
  if (!user) {
    return res.status(404).json({
      success: false,
      code: "USER_NOT_FOUND",
      message: "User not found",
    });
  }

  let otp;
  try {
    await otpService.checkRateLimit(normalizedEmail);
    otp = otpService.generateOtp();
    await otpService.storeOtp(normalizedEmail, otp);
    await sendOtpEmail(normalizedEmail, otp, otpService.OTP_TTL_SECONDS);
  } catch (err) {
    if (otp) {
      try {
        await otpService.clearOtp(normalizedEmail);
      } catch (clearErr) {
        console.error("Failed to clear OTP after email error:", clearErr.message);
      }
    }

    if (err.code === "REDIS_UNAVAILABLE") {
      return handleServiceError(res, err);
    }
    if (err.code === "RATE_LIMIT_EXCEEDED") {
      return handleServiceError(res, err);
    }
    if (err.message === "Email service is not configured") {
      return res.status(503).json({
        success: false,
        code: "EMAIL_NOT_CONFIGURED",
        message: "Email service is not configured",
      });
    }
    console.error("Forgot password email failed:", err.message);
    return res.status(503).json({
      success: false,
      code: "EMAIL_SEND_FAILED",
      message:
        "Could not send OTP to your email. Please contact support or try again later. " +
        "(Admin: verify EMAIL_USER and EMAIL_PASSWORD in .env — run: node scripts/test-smtp.js)",
    });
  }

  res.status(200).json({
    success: true,
    message: `OTP sent to ${normalizedEmail}. Check your inbox and spam folder.`,
    expiresInSeconds: otpService.OTP_TTL_SECONDS,
  });
});

/**
 * POST /api/users/verify-otp
 * Body: { email, otp }
 */
const verifyOtp = AsyncHandler(async (req, res) => {
  const { email, otp } = req.body;

  if (!email?.trim() || otp === undefined || otp === null || otp === "") {
    return res.status(400).json({
      success: false,
      code: "INVALID_REQUEST",
      message: "Email and OTP are required",
    });
  }

  const normalizedEmail = normalizeEmail(email);

  const user = await User.findOne({ email: normalizedEmail });
  if (!user) {
    return res.status(404).json({
      success: false,
      code: "USER_NOT_FOUND",
      message: "User not found",
    });
  }

  try {
    await otpService.verifyOtp(normalizedEmail, String(otp).trim());
  } catch (err) {
    return handleServiceError(res, err);
  }

  res.status(200).json({
    success: true,
    message: "OTP verified successfully. You may now reset your password.",
    verifiedForSeconds: otpService.VERIFIED_TTL_SECONDS,
  });
});

/**
 * POST /api/users/reset-password
 * Body: { email, newPassword }
 */
const resetPassword = AsyncHandler(async (req, res) => {
  const { email, newPassword } = req.body;

  if (!email?.trim() || !newPassword) {
    return res.status(400).json({
      success: false,
      code: "INVALID_REQUEST",
      message: "Email and new password are required",
    });
  }

  if (newPassword.length < 8) {
    return res.status(400).json({
      success: false,
      code: "WEAK_PASSWORD",
      message: "Password must be at least 8 characters long",
    });
  }

  const normalizedEmail = normalizeEmail(email);

  const user = await User.findOne({ email: normalizedEmail }).select("+password");
  if (!user) {
    return res.status(404).json({
      success: false,
      code: "USER_NOT_FOUND",
      message: "User not found",
    });
  }

  let isVerified = false;
  try {
    isVerified = await otpService.isOtpVerified(normalizedEmail);
  } catch (err) {
    return handleServiceError(res, err);
  }

  if (!isVerified) {
    return res.status(403).json({
      success: false,
      code: "OTP_NOT_VERIFIED",
      message: "OTP verification required before resetting password",
    });
  }

  const isSamePassword = await comparePassword(newPassword, user.password);
  if (isSamePassword) {
    return res.status(400).json({
      success: false,
      code: "SAME_PASSWORD",
      message: "New password must be different from current password",
    });
  }

  const hashedPassword = await hashPassword(newPassword);
  // Update only password — avoid full document save() which can fail on legacy
  // fields (e.g. role "superadmin" not in enum) and leave the password unchanged.
  const updateResult = await User.updateOne(
    { _id: user._id },
    { $set: { password: hashedPassword } }
  );

  if (updateResult.matchedCount !== 1) {
    return res.status(500).json({
      success: false,
      code: "PASSWORD_UPDATE_FAILED",
      message: "Password could not be saved. Please try again.",
    });
  }

  const saved = await User.findById(user._id).select("+password");
  const passwordSaved = await comparePassword(newPassword, saved.password);
  if (!passwordSaved) {
    return res.status(500).json({
      success: false,
      code: "PASSWORD_VERIFY_FAILED",
      message: "Password could not be saved. Please try again.",
    });
  }

  try {
    await otpService.clearVerification(normalizedEmail);
  } catch (err) {
    console.error("Failed to clear OTP verification state:", err.message);
  }

  res.status(200).json({
    success: true,
    message: "Password updated successfully",
  });
});

module.exports = {
  forgotPassword,
  verifyOtp,
  resetPassword,
};
