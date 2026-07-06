const crypto = require("crypto");
const AsyncHandler = require("express-async-handler");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const Invite = require("../models/Invite");
const User = require("../models/usermodel");
const { hashPassword } = require("../helpers/password");
const {
  normalizeRole,
  isSuperAdmin,
  isUserManager,
  canManageRole,
  VALID_ROLES,
} = require("../helpers/roles");
const { sendInviteEmail } = require("../services/emailService");

const INVITE_EXPIRY_HOURS =
  Number(process.env.INVITE_EXPIRY_HOURS) || 24 * 7;

const generateInviteToken = () => crypto.randomBytes(32).toString("hex");

const buildInviteUrl = (token) => {
  const base =
    process.env.FRONTEND_URL?.replace(/\/+$/, "") ||
    "http://localhost:5173";
  return `${base}/accept-invite/${token}`;
};

const generateToken = (user, expiresIn = "7d") =>
  jwt.sign(
    {
      id: user._id,
      name: user.name,
      email: user.email,
      role: normalizeRole(user.role),
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || expiresIn }
  );

const isExpired = (invite) =>
  invite.status === "pending" && invite.expiresAt < new Date();

const expireIfNeeded = async (invite) => {
  if (isExpired(invite)) {
    invite.status = "expired";
    await invite.save();
  }
  return invite;
};

const formatInvite = (invite) => ({
  _id: invite._id,
  email: invite.email,
  role: normalizeRole(invite.role),
  status: invite.status,
  invitedAt: invite.invitedAt,
  expiresAt: invite.expiresAt,
  acceptedAt: invite.acceptedAt,
  userId: invite.userId,
});

const assertCanManageInvites = (actorRole, targetRole) => {
  if (!isUserManager(actorRole)) {
    const err = new Error("You are not allowed to manage invites");
    err.statusCode = 403;
    throw err;
  }
  const normalizedTarget = normalizeRole(targetRole);
  if (!VALID_ROLES.includes(normalizedTarget)) {
    const err = new Error(`Invalid role. Allowed: ${VALID_ROLES.join(", ")}`);
    err.statusCode = 400;
    throw err;
  }
  if (!canManageRole(actorRole, normalizedTarget)) {
    const err = new Error(
      `You are not allowed to invite users with role "${normalizedTarget}"`
    );
    err.statusCode = 403;
    throw err;
  }
};

const assertInviteOwnership = (req, invite) => {
  const actorRole = normalizeRole(req.user?.role);
  if (
    !isSuperAdmin(actorRole) &&
    String(invite.invitedBy) !== String(req.user._id)
  ) {
    const err = new Error("Not allowed");
    err.statusCode = 403;
    throw err;
  }
};

const removePendingInviteBundle = async (email) => {
  const normalizedEmail = email.trim().toLowerCase();
  const pendingInvites = await Invite.find({
    email: normalizedEmail,
    status: "pending",
  });

  for (const invite of pendingInvites) {
    if (invite.userId) {
      await User.deleteOne({ _id: invite.userId, invitePending: true });
    }
    await Invite.deleteOne({ _id: invite._id });
  }
};

const createAndSendInvite = async ({ email, role, invitedBy }) => {
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedRole = normalizeRole(role);

  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser && !existingUser.invitePending) {
    const err = new Error("A user with this email already exists");
    err.statusCode = 400;
    throw err;
  }

  await removePendingInviteBundle(normalizedEmail);

  const tempPassword = crypto.randomBytes(32).toString("hex");
  const hashedPass = await hashPassword(tempPassword);
  const placeholderName =
    normalizedEmail.split("@")[0]?.replace(/[._]/g, " ") || "Invited User";

  const invitedUser = await User.create({
    name: placeholderName,
    email: normalizedEmail,
    password: hashedPass,
    role: normalizedRole,
    invitePending: true,
    loginCount: 0,
    isOnline: false,
    status: "offline",
  });

  const token = generateInviteToken();
  const expiresAt = new Date(Date.now() + INVITE_EXPIRY_HOURS * 60 * 60 * 1000);

  const invite = await Invite.create({
    email: normalizedEmail,
    role: normalizedRole,
    token,
    status: "pending",
    invitedBy,
    userId: invitedUser._id,
    invitedAt: new Date(),
    expiresAt,
  });

  const inviteUrl = buildInviteUrl(token);
  let emailSent = false;
  try {
    await sendInviteEmail(normalizedEmail, inviteUrl, normalizedRole);
    emailSent = true;
  } catch (err) {
    console.error("Invite email failed:", err.message);
    await User.deleteOne({ _id: invitedUser._id });
    await Invite.deleteOne({ _id: invite._id });
    if (process.env.NODE_ENV === "production") {
      throw err;
    }
    console.log(`[DEV] Invite link for ${normalizedEmail}: ${inviteUrl}`);
    throw err;
  }

  return { invite, emailSent, inviteUrl, user: invitedUser };
};

/** GET /api/users/invites/count */
const invitedUsersCount = AsyncHandler(async (req, res) => {
  const actorRole = normalizeRole(req.user?.role);
  if (!isUserManager(actorRole)) {
    return res.status(403).json({ success: false, message: "Not allowed" });
  }

  await Invite.updateMany(
    { status: "pending", expiresAt: { $lt: new Date() } },
    { $set: { status: "expired" } }
  );

  const filter = { status: "pending" };
  if (!isSuperAdmin(actorRole)) {
    filter.invitedBy = req.user._id;
  }

  const count = await Invite.countDocuments(filter);
  res.json({ success: true, count });
});

/** GET /api/users/invites */
const getInvitedUsers = AsyncHandler(async (req, res) => {
  const actorRole = normalizeRole(req.user?.role);
  if (!isUserManager(actorRole)) {
    return res.status(403).json({ success: false, message: "Not allowed" });
  }

  const filter = isSuperAdmin(actorRole) ? {} : { invitedBy: req.user._id };
  const invites = await Invite.find(filter).sort({ invitedAt: -1 }).limit(200);

  const data = [];
  for (const invite of invites) {
    await expireIfNeeded(invite);
    data.push(formatInvite(invite));
  }

  res.json({ success: true, data });
});

/** POST /api/users/invites */
const sendInvite = AsyncHandler(async (req, res) => {
  const { email, role } = req.body;
  if (!email?.trim() || !role) {
    return res.status(400).json({
      success: false,
      message: "Email and role are required",
    });
  }

  assertCanManageInvites(normalizeRole(req.user?.role), role);

  const { invite, emailSent } = await createAndSendInvite({
    email,
    role,
    invitedBy: req.user._id,
  });

  res.status(201).json({
    success: true,
    message: emailSent
      ? "User saved and invite email sent successfully"
      : "User saved (email not sent — check server logs in dev)",
    data: formatInvite(invite),
    emailSent,
  });
});

/** POST /api/users/invites/:inviteId/resend */
const resendInvite = AsyncHandler(async (req, res) => {
  const { inviteId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(inviteId)) {
    return res.status(400).json({ success: false, message: "Invalid invite id" });
  }

  const invite = await Invite.findById(inviteId);
  if (!invite) {
    return res.status(404).json({ success: false, message: "Invite not found" });
  }

  assertCanManageInvites(normalizeRole(req.user?.role), invite.role);
  assertInviteOwnership(req, invite);

  if (invite.status !== "pending") {
    return res.status(400).json({
      success: false,
      message: `Cannot resend invite with status "${invite.status}"`,
    });
  }

  await expireIfNeeded(invite);
  if (invite.status === "expired") {
    return res.status(400).json({
      success: false,
      message: "Invite has expired. Send a new invite instead.",
    });
  }

  invite.token = generateInviteToken();
  invite.expiresAt = new Date(
    Date.now() + INVITE_EXPIRY_HOURS * 60 * 60 * 1000
  );
  invite.invitedAt = new Date();
  await invite.save();

  const inviteUrl = buildInviteUrl(invite.token);
  await sendInviteEmail(invite.email, inviteUrl, invite.role);

  res.json({
    success: true,
    message: "Invite resent successfully",
    data: formatInvite(invite),
  });
});

/** DELETE /api/users/invites/:inviteId — hard delete invite + pending user */
const deleteInvite = AsyncHandler(async (req, res) => {
  const { inviteId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(inviteId)) {
    return res.status(400).json({ success: false, message: "Invalid invite id" });
  }

  const invite = await Invite.findById(inviteId);
  if (!invite) {
    return res.status(404).json({ success: false, message: "Invite not found" });
  }

  assertCanManageInvites(normalizeRole(req.user?.role), invite.role);
  assertInviteOwnership(req, invite);

  if (invite.status !== "pending") {
    return res.status(400).json({
      success: false,
      message: `Only pending invites can be deleted`,
    });
  }

  if (invite.userId) {
    await User.deleteOne({ _id: invite.userId, invitePending: true });
  }
  await Invite.deleteOne({ _id: invite._id });

  res.json({
    success: true,
    message: "Invite and pending user deleted",
  });
});

/** GET /api/users/invites/:token — public validate */
const validateInviteToken = AsyncHandler(async (req, res) => {
  const { token } = req.params;
  if (!token || token.length < 20 || token === "count") {
    return res.status(400).json({ success: false, message: "Invalid invite link" });
  }

  const invite = await Invite.findOne({ token });
  if (!invite) {
    return res.status(404).json({ success: false, message: "Invite not found" });
  }

  await expireIfNeeded(invite);

  if (invite.status !== "pending") {
    return res.status(400).json({
      success: false,
      message:
        invite.status === "accepted"
          ? "This invite has already been used"
          : "This invite has expired",
      status: invite.status,
    });
  }

  res.json({
    success: true,
    data: {
      email: invite.email,
      role: normalizeRole(invite.role),
      expiresAt: invite.expiresAt,
    },
  });
});

/** POST /api/users/invites/:token/accept — activate saved user + role dashboard */
const acceptInvite = AsyncHandler(async (req, res) => {
  const { token } = req.params;
  const { name, password } = req.body;

  if (!token || token.length < 20 || token === "count") {
    return res.status(400).json({ success: false, message: "Invalid invite link" });
  }
  if (!name?.trim() || !password) {
    return res.status(400).json({
      success: false,
      message: "Name and password are required",
    });
  }
  if (password.length < 8) {
    return res.status(400).json({
      success: false,
      message: "Password must be at least 8 characters",
    });
  }

  const invite = await Invite.findOne({ token });
  if (!invite) {
    return res.status(404).json({ success: false, message: "Invite not found" });
  }

  await expireIfNeeded(invite);
  if (invite.status !== "pending") {
    return res.status(400).json({
      success: false,
      message: "This invite is no longer valid",
      status: invite.status,
    });
  }

  let user = null;
  if (invite.userId) {
    user = await User.findById(invite.userId).select("+password");
  }
  if (!user) {
    user = await User.findOne({ email: invite.email }).select("+password");
  }

  if (!user || !user.invitePending) {
    return res.status(400).json({
      success: false,
      message: "No pending account found for this invite. Contact your admin.",
    });
  }

  const hashedPass = await hashPassword(password);
  user.name = name.trim();
  user.password = hashedPass;
  user.role = normalizeRole(invite.role);
  user.invitePending = false;
  user.loginCount = 1;
  user.isOnline = true;
  user.status = "online";
  user.lastActive = new Date();
  await user.save();

  invite.status = "accepted";
  invite.acceptedAt = new Date();
  await invite.save();

  const normalizedRole = normalizeRole(user.role);
  const authToken = generateToken({
    _id: user._id,
    name: user.name,
    email: user.email,
    role: normalizedRole,
  });

  res.status(201).json({
    success: true,
    message: "Account activated successfully",
    token: authToken,
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: normalizedRole,
      isOnline: true,
      status: "online",
    },
  });
});

module.exports = {
  invitedUsersCount,
  getInvitedUsers,
  sendInvite,
  resendInvite,
  deleteInvite,
  validateInviteToken,
  acceptInvite,
};
