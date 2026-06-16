const redisClient = require("../config/redis");

const WINDOW_SECONDS = 15 * 60;

const getClientIp = (req) => {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || "unknown";
};

const createRedisRateLimiter =
  ({ keyPrefix, maxRequests, message }) =>
  async (req, res, next) => {
    try {
      if (!redisClient.isOpen) {
        return next();
      }

      const ip = getClientIp(req);
      const key = `${keyPrefix}:${ip}`;
      const count = await redisClient.incr(key);

      if (count === 1) {
        await redisClient.expire(key, WINDOW_SECONDS);
      }

      if (count > maxRequests) {
        return res.status(429).json({
          success: false,
          code: "RATE_LIMIT_EXCEEDED",
          message,
        });
      }

      return next();
    } catch (err) {
      console.error(`Rate limiter error [${keyPrefix}]:`, err.message);
      return next();
    }
  };

const forgotPasswordLimiter = createRedisRateLimiter({
  keyPrefix: "pwd-reset:ip:forgot",
  maxRequests: Number(process.env.FORGOT_PASSWORD_IP_LIMIT) || 5,
  message: "Too many forgot-password attempts. Please try again later.",
});

const verifyOtpLimiter = createRedisRateLimiter({
  keyPrefix: "pwd-reset:ip:verify",
  maxRequests: Number(process.env.VERIFY_OTP_IP_LIMIT) || 10,
  message: "Too many OTP verification attempts. Please try again later.",
});

const resetPasswordLimiter = createRedisRateLimiter({
  keyPrefix: "pwd-reset:ip:reset",
  maxRequests: Number(process.env.RESET_PASSWORD_IP_LIMIT) || 5,
  message: "Too many reset-password attempts. Please try again later.",
});

const signupLimiter = createRedisRateLimiter({
  keyPrefix: "auth:ip:signup",
  maxRequests: Number(process.env.SIGNUP_IP_LIMIT) || 5,
  message: "Too many signup attempts. Please try again later.",
});

module.exports = {
  forgotPasswordLimiter,
  verifyOtpLimiter,
  resetPasswordLimiter,
  signupLimiter,
};
