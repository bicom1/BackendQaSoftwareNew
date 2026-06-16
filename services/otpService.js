const crypto = require("crypto");
const redisClient = require("../config/redis");

const OTP_PREFIX = "pwd-reset:otp:";
const VERIFIED_PREFIX = "pwd-reset:verified:";
const RATE_PREFIX = "pwd-reset:rate:";

const OTP_TTL_SECONDS =
  Number(process.env.OTP_EXPIRY_SECONDS) || 10 * 60;
const VERIFIED_TTL_SECONDS =
  Number(process.env.OTP_VERIFIED_TTL_SECONDS) || 15 * 60;
const MAX_OTP_REQUESTS_PER_HOUR =
  Number(process.env.OTP_MAX_REQUESTS_PER_HOUR) || 3;

const getOtpSecret = () =>
  process.env.OTP_SECRET || process.env.JWT_SECRET || "otp-fallback-secret";

const normalizeEmail = (email) => email.trim().toLowerCase();

const hashOtp = (email, otp) =>
  crypto.createHmac("sha256", getOtpSecret()).update(`${email}:${otp}`).digest("hex");

const ensureRedisReady = () => {
  if (!redisClient.isOpen) {
    const error = new Error("Redis is not connected");
    error.statusCode = 503;
    error.code = "REDIS_UNAVAILABLE";
    throw error;
  }
};

const generateOtp = () =>
  String(crypto.randomInt(100000, 1000000));

exports.OTP_TTL_SECONDS = OTP_TTL_SECONDS;
exports.VERIFIED_TTL_SECONDS = VERIFIED_TTL_SECONDS;

exports.checkRateLimit = async (email) => {
  ensureRedisReady();
  const key = `${RATE_PREFIX}${normalizeEmail(email)}`;

  const current = await redisClient.get(key);
  if (current && Number(current) >= MAX_OTP_REQUESTS_PER_HOUR) {
    const error = new Error(
      "Too many OTP requests. Please try again after an hour."
    );
    error.statusCode = 429;
    error.code = "RATE_LIMIT_EXCEEDED";
    throw error;
  }

  const count = await redisClient.incr(key);
  if (count === 1) {
    await redisClient.expire(key, 60 * 60);
  }
};

exports.storeOtp = async (email, otp) => {
  ensureRedisReady();
  const normalized = normalizeEmail(email);
  const key = `${OTP_PREFIX}${normalized}`;
  await redisClient.setEx(key, OTP_TTL_SECONDS, hashOtp(normalized, otp));
};

exports.clearOtp = async (email) => {
  ensureRedisReady();
  const normalized = normalizeEmail(email);
  await redisClient.del(`${OTP_PREFIX}${normalized}`);
};

exports.verifyOtp = async (email, otp) => {
  ensureRedisReady();
  const normalized = normalizeEmail(email);
  const key = `${OTP_PREFIX}${normalized}`;
  const storedHash = await redisClient.get(key);

  if (!storedHash) {
    const error = new Error("OTP has expired or was not requested");
    error.statusCode = 400;
    error.code = "OTP_EXPIRED";
    throw error;
  }

  const submittedHash = hashOtp(normalized, String(otp).trim());

  if (storedHash.length !== submittedHash.length) {
    const error = new Error("Invalid OTP");
    error.statusCode = 400;
    error.code = "OTP_INVALID";
    throw error;
  }

  const isValid = crypto.timingSafeEqual(
    Buffer.from(storedHash),
    Buffer.from(submittedHash)
  );

  if (!isValid) {
    const error = new Error("Invalid OTP");
    error.statusCode = 400;
    error.code = "OTP_INVALID";
    throw error;
  }

  await redisClient.del(key);
  await redisClient.setEx(
    `${VERIFIED_PREFIX}${normalized}`,
    VERIFIED_TTL_SECONDS,
    "1"
  );

  return true;
};

exports.isOtpVerified = async (email) => {
  ensureRedisReady();
  const normalized = normalizeEmail(email);
  const verified = await redisClient.get(`${VERIFIED_PREFIX}${normalized}`);
  return Boolean(verified);
};

exports.clearVerification = async (email) => {
  ensureRedisReady();
  const normalized = normalizeEmail(email);
  await redisClient.del(`${VERIFIED_PREFIX}${normalized}`);
};

exports.generateOtp = generateOtp;
