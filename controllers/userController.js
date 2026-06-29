// const AsyncHandler = require("express-async-handler");
// const bcrypt = require("bcrypt");
// const jwt = require("jsonwebtoken");
// const User = require("../models/usermodel");
// const { sendPasswordResetEmail } = require("../services/emailService");

// /** Generate a signed JWT for the given user id */
// const generateToken = (user, expiresIn = "1d") => {
//   return jwt.sign(
//     {
//       id: user._id,
//       name: user.name,
//       email: user.email,
//       role: user.role, // optional but useful
//     },
//     process.env.JWT_SECRET,
//     { expiresIn }
//   );
// };

// const registerUser = AsyncHandler(async (req, res) => {
//   const { name, email, password, role } = req.body;

//   // ✅ Normalize role for QC User and Agent User
//   const roleMap = {
//     "qc user": "Qc User",
//     qc_user: "Qc User",
//     "agent user": "Agent User",
//     agent_user: "Agent User",
//   };

//   const normalizedRole =
//     roleMap[role?.toLowerCase()?.replace(/\s+/g, "_")] || null;

//   if (!normalizedRole) {
//     return res.status(400).json({
//       success: false,
//       message: "Invalid role. Allowed roles are: Qc User, Agent User",
//     });
//   }

//   // ✅ Check existing user
//   const existing = await User.findOne({ email });
//   if (existing)
//     return res
//       .status(400)
//       .json({ success: false, message: "User already exists" });

//   // ✅ Hash password and create user
//   const hashedPassword = await bcrypt.hash(password, 10);
//   const newUser = await User.create({
//     name,
//     email,
//     password: hashedPassword,
//     role: normalizedRole,
//     loginCount: 0,
//   });

//   const token = generateToken(newUser._id);
//   const normalizedEmail = email.trim().toLowerCase();

//   // ✅ Role-based redirects (only for these two roles)
//   const redirectMap = {
//     "Agent User": `/agent/${normalizedEmail}`,
//     "Qc User": `/dashboard/qc-team`,
//   };

//   // ✅ Response
//   res.status(201).json({
//     success: true,
//     message: "User registered successfully",
//     token,
//     redirectTo: redirectMap[normalizedRole] || "/",
//     user: {
//       _id: newUser._id,
//       name: newUser.name,
//       email: newUser.email,
//       role: newUser.role,
//       loginCount: newUser.loginCount,
//     },
//   });
// });

// // const registerUser = AsyncHandler(async (req, res) => {
// //   const { name, email, password, role } = req.body;

// //   if (!name || !email || !password || !role) {
// //     res.status(400);
// //     throw new Error("Please fill in all fields");
// //   }

// //   const checkUser = await User.findOne({ email });
// //   if (checkUser) {
// //     res.status(400);
// //     throw new Error("Email already exists");
// //   }

// //   const salt = await bcrypt.genSalt(10);
// //   const hashedPass = await bcrypt.hash(password, salt);

// //   const createUser = await User.create({
// //     name,
// //     email,
// //     password: hashedPass,
// //     role,
// //     loginCount: 1,
// //   });

// //   await createUser.setOnline();

// //   res.json({
// //     _id: createUser._id,
// //     name: createUser.name,
// //     email: createUser.email,
// //     role: createUser.role,
// //     isOnline: createUser.isOnline,
// //     status: createUser.status,
// //     token: generateToken(createUser), // pass full user, not just id
// //   });
// // });
// /** ✅ LOGIN USER */
// const loginUser = AsyncHandler(async (req, res) => {
//   const { email, password } = req.body;

//   const user = await User.findOne({ email }).select("+password");
//   if (!user)
//     return res
//       .status(401)
//       .json({ success: false, message: "Invalid credentials" });

//   const isMatch = await bcrypt.compare(password, user.password);
//   if (!isMatch)
//     return res
//       .status(401)
//       .json({ success: false, message: "Invalid credentials" });

//   const token = generateToken(user._id);
//   user.loginCount += 1;
//   await user.save();

//   const normalizedEmail = email.trim().toLowerCase();

//   // ✅ Only these two redirect paths
//   const redirectMap = {
//     "Agent User": `/agent/${normalizedEmail}`,
//     "Qc User": `/dashboard/qc/${normalizedEmail}`,
//   };

//   res.status(200).json({
//     success: true,
//     message: "Login successful",
//     token,
//     redirectTo: redirectMap[user.role] || "/",
//     user: {
//       _id: user._id,
//       name: user.name,
//       email: user.email,
//       role: user.role,
//       loginCount: user.loginCount,
//     },
//   });
// });

// /**
//  * Send password reset link (JWT 15m) to user if exists (no-leak response)
//  */
// const forgotPassword = AsyncHandler(async (req, res) => {
//   const { email } = req.body;
//   const user = await User.findOne({ email });

//   if (!user) {
//     return res
//       .status(200)
//       .json({ message: "If an account exists, a reset link has been sent" });
//   }

//   // Generate reset token (JWT valid for 15m)
//   const resetToken = generateToken(user._id, "15m");
//   const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

//   await sendPasswordResetEmail(user.email, resetLink);

//   res
//     .status(200)
//     .json({ message: "If an account exists, a reset link has been sent" });
// });

// /**
//  * Reset password with provided token and new password
//  */
// const resetPassword = AsyncHandler(async (req, res) => {
//   const { token, newPassword } = req.body;

//   if (!token || !newPassword) {
//     return res
//       .status(400)
//       .json({ message: "Token and new password are required" });
//   }
//   if (newPassword.length < 8) {
//     return res
//       .status(400)
//       .json({ message: "Password must be at least 8 characters long" });
//   }

//   let decoded;
//   try {
//     decoded = jwt.verify(token, process.env.JWT_SECRET);
//   } catch (err) {
//     return res.status(400).json({ message: "Invalid or expired reset token" });
//   }

//   const user = await User.findById(decoded.id);
//   if (!user) {
//     return res.status(404).json({ message: "User not found" });
//   }

//   const isSamePassword = await bcrypt.compare(newPassword, user.password);
//   if (isSamePassword) {
//     return res.status(400).json({
//       message: "New password must be different from current password",
//     });
//   }

//   user.password = await bcrypt.hash(newPassword, 12);
//   await user.save();

//   res
//     .status(200)
//     .json({ success: true, message: "Password updated successfully" });
// });

// /** Return current authenticated user profile (sans password) */
// const findMyProfile = AsyncHandler(async (req, res) => {
//   if (!req.user) {
//     return res.status(401).json({ message: "Not authorized, token failed" });
//   }

//   const foundUser = await User.findById(req.user._id).select("-password");
//   if (!foundUser) {
//     res.status(404);
//     throw new Error("User not found");
//   }

//   res.status(200).json(foundUser);
// });

// /** Update user status: online | offline | away | busy */
// const updateUserStatus = AsyncHandler(async (req, res) => {
//   const { status } = req.body;

//   if (!["online", "offline", "away", "busy"].includes(status)) {
//     return res.status(400).json({ message: "Invalid status value" });
//   }

//   const user = await User.findById(req.user._id);
//   if (!user) {
//     return res.status(404).json({ message: "User not found" });
//   }

//   user.status = status;
//   if (status === "offline") {
//     user.isOnline = false;
//     user.socketId = null;
//   } else if (status === "online") {
//     user.isOnline = true;
//   }

//   await user.save();

//   res.status(200).json({
//     success: true,
//     message: "Status updated successfully",
//     user: {
//       _id: user._id,
//       status: user.status,
//       isOnline: user.isOnline,
//     },
//   });
// });

// /** Touch lastActive timestamp to now */
// const updateUserActivity = AsyncHandler(async (req, res) => {
//   const user = await User.findById(req.user._id);
//   if (!user) {
//     return res.status(404).json({ message: "User not found" });
//   }

//   await user.updateActivity();

//   res.status(200).json({
//     success: true,
//     message: "Activity updated successfully",
//     lastActive: user.lastActive,
//   });
// });

// /** Explicitly set user online and optionally store socketId */
// const setUserOnline = AsyncHandler(async (req, res) => {
//   const { socketId } = req.body;
//   const user = await User.findById(req.user._id);

//   if (!user) {
//     return res.status(404).json({ message: "User not found" });
//   }

//   await user.setOnline(socketId);

//   res.status(200).json({
//     success: true,
//     message: "User is now online",
//     user: {
//       _id: user._id,
//       isOnline: user.isOnline,
//       status: user.status,
//       socketId: user.socketId,
//       lastActive: user.lastActive,
//     },
//   });
// });

// /** Explicitly set user offline */
// const setUserOffline = AsyncHandler(async (req, res) => {
//   const user = await User.findById(req.user._id);

//   if (!user) {
//     return res.status(404).json({ message: "User not found" });
//   }

//   await user.setOffline();

//   res.status(200).json({
//     success: true,
//     message: "User is now offline",
//     user: {
//       _id: user._id,
//       isOnline: user.isOnline,
//       status: user.status,
//       socketId: user.socketId,
//     },
//   });
// });

// /** List all users (admin contexts) without passwords */
// const getAllUsers = AsyncHandler(async (req, res) => {
//   const users = await User.find({}).select("-password");
//   res.status(200).json({ success: true, count: users.length, data: users });
// });

// /** List users with isOnline=true and select presence fields */
// const getOnlineUsers = AsyncHandler(async (req, res) => {
//   const onlineUsers = await User.find({ isOnline: true }).select(
//     "name email status lastActive"
//   );
//   res
//     .status(200)
//     .json({ success: true, count: onlineUsers.length, data: onlineUsers });
// });

// /** Return total user count */
// const totalUserCount = AsyncHandler(async (req, res) => {
//   const count = await User.countDocuments();
//   res.status(200).json({ success: true, count });
// });

// /** Return count of online users */
// const onlineUserCount = AsyncHandler(async (req, res) => {
//   const count = await User.countDocuments({ isOnline: true });
//   res.status(200).json({ success: true, count });
// });

// /**
//  * Logout current user (clear cookie if present and mark offline)
//  */
// const logout = AsyncHandler(async (req, res) => {
//   try {
//     // Set user offline before logging out
//     const user = await User.findById(req.user._id);
//     if (user) {
//       await user.setOffline();
//     }

//     res.clearCookie("token", {
//       httpOnly: true,
//       secure: process.env.NODE_ENV === "production",
//       sameSite: "strict",
//     });

//     res.status(200).json({ success: true, message: "Logged out successfully" });
//   } catch (error) {
//     res.status(500).json({ success: false, message: "Error during logout" });
//   }
// });

// /**
//  * Aggregated stats for current user across Evaluations and Escalations
//  */
// const getUserSubmissionStats = async (req, res) => {
//   try {
//     const userId = req.user._id;

//     const userStats = await User.aggregate([
//       {
//         $match: { _id: userId },
//       },
//       {
//         $lookup: {
//           from: "evaluations",
//           localField: "_id",
//           foreignField: "userId",
//           as: "evaluations",
//         },
//       },
//       {
//         $lookup: {
//           from: "escalations",
//           localField: "_id",
//           foreignField: "userId",
//           as: "escalations",
//         },
//       },
//       {
//         $project: {
//           name: 1,
//           email: 1,
//           isOnline: 1,
//           status: 1,
//           lastActive: 1,
//           loginCount: 1,
//           evaluationCount: { $size: "$evaluations" },
//           escalationCount: { $size: "$escalations" },
//           totalSubmissions: {
//             $add: [{ $size: "$evaluations" }, { $size: "$escalations" }],
//           },
//         },
//       },
//     ]);

//     if (userStats.length === 0) {
//       return res.status(404).json({
//         success: false,
//         message: "User not found",
//       });
//     }

//     res.status(200).json({
//       success: true,
//       data: userStats[0],
//     });
//   } catch (error) {
//     console.error("Error fetching user submission stats:", error);
//     res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };

// /** Aggregated stats for all users (sorted by total submissions) */
// const getAllUsersSubmissionStats = async (req, res) => {
//   try {
//     const usersStats = await User.aggregate([
//       {
//         $lookup: {
//           from: "evaluations",
//           localField: "_id",
//           foreignField: "userId",
//           as: "evaluations",
//         },
//       },
//       {
//         $lookup: {
//           from: "escalations",
//           localField: "_id",
//           foreignField: "userId",
//           as: "escalations",
//         },
//       },
//       {
//         $project: {
//           name: 1,
//           email: 1,
//           role: 1,
//           isOnline: 1,
//           status: 1,
//           lastActive: 1,
//           loginCount: 1,
//           evaluationCount: { $size: "$evaluations" },
//           escalationCount: { $size: "$escalations" },
//           totalSubmissions: {
//             $add: [{ $size: "$evaluations" }, { $size: "$escalations" }],
//           },
//         },
//       },
//       {
//         $sort: { totalSubmissions: -1 },
//       },
//     ]);

//     res.status(200).json({
//       success: true,
//       data: usersStats,
//       totalUsers: usersStats.length,
//     });
//   } catch (error) {
//     console.error("Error fetching all users submission stats:", error);
//     res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };

// const getUserById = async (req, res) => {
//   try {
//     const user = await User.findById(req.params.id).select("-password");
//     if (!user) return res.status(404).json({ message: "User not found" });

//     res.json({ success: true, data: user });
//   } catch (error) {
//     res.status(500).json({ success: false, message: error.message });
//   }
// };

// // UPDATE user (PUT = full replace)
// const updateUser = async (req, res) => {
//   try {
//     const updated = await User.findByIdAndUpdate(req.params.id, req.body, {
//       new: true,
//       runValidators: true,
//     });

//     if (!updated) return res.status(404).json({ message: "User not found" });

//     res.json({ success: true, data: updated });
//   } catch (error) {
//     res.status(500).json({ success: false, message: error.message });
//   }
// };

// // PATCH user (partial update)
// const patchUser = async (req, res) => {
//   try {
//     const { id } = req.params;

//     // Apply only the fields sent in body
//     const updated = await User.findByIdAndUpdate(
//       id,
//       { $set: req.body }, // 👈 ensures partial update
//       { new: true, runValidators: true }
//     );

//     if (!updated) {
//       return res
//         .status(404)
//         .json({ success: false, message: "User not found" });
//     }

//     res.json({ success: true, data: updated });
//   } catch (error) {
//     res.status(500).json({ success: false, message: error.message });
//   }
// };

// // DELETE user
// const deleteUser = async (req, res) => {
//   try {
//     console.log("🟢 DELETE request hit for user:", req.params.id);
//     const deleted = await User.findByIdAndDelete(req.params.id);

//     if (!deleted) return res.status(404).json({ message: "User not found" });

//     res.json({ success: true, message: "User deleted successfully" });
//   } catch (error) {
//     console.error("❌ Delete error:", error.message);
//     res.status(500).json({ success: false, message: error.message });
//   }
// };

// module.exports = {
//   registerUser,
//   loginUser,
//   forgotPassword,
//   resetPassword,
//   findMyProfile,
//   updateUserStatus,
//   updateUserActivity,
//   setUserOnline,
//   setUserOffline,
//   getAllUsers,
//   getOnlineUsers,
//   totalUserCount,
//   onlineUserCount,
//   logout,
//   getUserSubmissionStats,
//   getAllUsersSubmissionStats,
//   getUserById,
//   patchUser,
//   deleteUser,
//   updateUser,
// };
const AsyncHandler = require("express-async-handler");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/usermodel");
const {
  ROLES,
  VALID_ROLES,
  normalizeRole,
  isSuperAdmin,
  isUserManager,
  canManageRole,
  getManageableRoles,
  getVisibleUserRoles,
  getRoleQueryVariants,
  buildVisibleRolesFilter,
  isPublicSignupRole,
} = require("../helpers/roles");
const { hashPassword, comparePassword } = require("../helpers/password");

/** Generate a signed JWT for the given user id */
const generateToken = (user, expiresIn = "1d") => {
  return jwt.sign(
    {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role, // optional but useful
    },
    process.env.JWT_SECRET,
    { expiresIn }
  );
};

const registerUser = AsyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password || !role) {
    res.status(400);
    throw new Error("Please fill in all fields");
  }

  if (password.length < 8) {
    res.status(400);
    throw new Error("Password must be at least 8 characters");
  }

  const normalizedRole = normalizeRole(role);

  if (req.registerMode === "bootstrap") {
    if (!VALID_ROLES.includes(normalizedRole)) {
      res.status(400);
      throw new Error(
        `Invalid role. Allowed roles: ${VALID_ROLES.join(", ")}`
      );
    }
  } else {
    const actorRole = normalizeRole(req.user?.role);
    if (!canManageRole(actorRole, normalizedRole)) {
      return res.status(403).json({
        success: false,
        message: `You are not allowed to create users with role "${normalizedRole}"`,
      });
    }
  }

  const normalizedEmail = email.trim().toLowerCase();
  const checkUser = await User.findOne({ email: normalizedEmail });
  if (checkUser) {
    res.status(400);
    throw new Error("Email already exists");
  }

  const hashedPass = await hashPassword(password);

  const createUser = await User.create({
    name: name.trim(),
    email: normalizedEmail,
    password: hashedPass,
    role: normalizedRole,
    loginCount: 0,
    isOnline: false,
    status: "offline",
  });

  res.status(201).json({
    success: true,
    message: "User registered successfully",
    token: generateToken({
      ...createUser.toObject(),
      role: normalizeRole(createUser.role),
    }),
    user: {
      _id: createUser._id,
      name: createUser.name,
      email: createUser.email,
      role: normalizeRole(createUser.role),
    },
  });
});

/**
 * Public signup — no token required.
 * First account in the database becomes admin; others default to agent_user.
 */
const signupUser = AsyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;

  if (!name?.trim() || !email?.trim() || !password) {
    return res.status(400).json({
      success: false,
      message: "Name, email, and password are required",
    });
  }

  if (password.length < 8) {
    return res.status(400).json({
      success: false,
      message: "Password must be at least 8 characters",
    });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const existing = await User.findOne({ email: normalizedEmail });
  if (existing) {
    return res.status(400).json({
      success: false,
      message: "Email already exists. Please login or use forgot password.",
    });
  }

  const userCount = await User.countDocuments();
  let assignedRole = ROLES.AGENT_USER;

  if (userCount === 0) {
    assignedRole = ROLES.SUPER_ADMIN;
  } else if (role && isPublicSignupRole(role)) {
    assignedRole = normalizeRole(role);
  }

  const hashedPass = await hashPassword(password);
  const newUser = await User.create({
    name: name.trim(),
    email: normalizedEmail,
    password: hashedPass,
    role: assignedRole,
    loginCount: 1,
    isOnline: true,
    status: "online",
    lastActive: new Date(),
  });

  const token = generateToken({
    ...newUser.toObject(),
    role: normalizeRole(newUser.role),
  });

  res.status(201).json({
    success: true,
    message: "Account created successfully",
    token,
    user: {
      _id: newUser._id,
      name: newUser.name,
      email: newUser.email,
      role: normalizeRole(newUser.role),
      isOnline: true,
      status: "online",
    },
  });
});

/**
 * User login with email/password. Increments loginCount and sets presence online.
 */
const loginUser = AsyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email?.trim() || !password) {
    return res
      .status(400)
      .json({ success: false, message: "Email and password are required" });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const user = await User.findOne({ email: normalizedEmail }).select("+password");
  if (!user) {
    if (process.env.NODE_ENV !== "production") {
      console.log(`[login] No user found for email: ${normalizedEmail}`);
    }
    return res
      .status(401)      
      .json({ success: false, message: "Invalid credentials" });
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    if (process.env.NODE_ENV !== "production") {
      console.log(
        `[login] Password mismatch for ${normalizedEmail} (user exists)`
      );
    }
    return res
      .status(401)
      .json({ success: false, message: "Invalid credentials" });
  }

  const token = generateToken({ ...user.toObject(), role: normalizeRole(user.role) });
  await User.updateOne(
    { _id: user._id },
    {
      $set: {
        isOnline: true,
        status: "online",
        lastActive: new Date(),
      },
      $inc: { loginCount: 1 },
    }
  );

  const loginCount = (user.loginCount || 0) + 1;

  res.status(200).json({
    success: true,
    token,
    message: "Login Successfil",
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: normalizeRole(user.role),
      isOnline: true,
      status: "online",
      lastActive: new Date(),
      loginCount: loginCount,
    },
  });
});

/** Return current authenticated user profile (sans password) */
const findMyProfile = AsyncHandler(async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: "Not authorized, token failed" });
  }

  const foundUser = await User.findById(req.user._id).select("-password");
  if (!foundUser) {
    res.status(404);
    throw new Error("User not found");
  }

  res.status(200).json(foundUser);
});

/** Update user status: online | offline | away | busy */
const updateUserStatus = AsyncHandler(async (req, res) => {
  const { status } = req.body;

  if (!["online", "offline", "away", "busy"].includes(status)) {
    return res.status(400).json({ message: "Invalid status value" });
  }

  const user = await User.findById(req.user._id);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  user.status = status;
  if (status === "offline") {
    user.isOnline = false;
    user.socketId = null;
  } else if (status === "online") {
    user.isOnline = true;
  }

  await user.save();

  res.status(200).json({
    success: true,
    message: "Status updated successfully",
    user: {
      _id: user._id,
      status: user.status,
      isOnline: user.isOnline,
    },
  });
});

/** Touch lastActive timestamp to now */
const updateUserActivity = AsyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  await user.updateActivity();

  res.status(200).json({
    success: true,
    message: "Activity updated successfully",
    lastActive: user.lastActive,
  });
});

/** Explicitly set user online and optionally store socketId */
const setUserOnline = AsyncHandler(async (req, res) => {
  const { socketId } = req.body;
  const user = await User.findById(req.user._id);

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  await user.setOnline(socketId);

  res.status(200).json({
    success: true,
    message: "User is now online",
    user: {
      _id: user._id,
      isOnline: user.isOnline,
      status: user.status,
      socketId: user.socketId,
      lastActive: user.lastActive,
    },
  });
});

/** Explicitly set user offline */
const setUserOffline = AsyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  await user.setOffline();

  res.status(200).json({
    success: true,
    message: "User is now offline",
    user: {
      _id: user._id,
      isOnline: user.isOnline,
      status: user.status,
      socketId: user.socketId,
    },
  });
});

/** List users visible to the requester's role (RBAC-filtered) */
const getAllUsers = AsyncHandler(async (req, res) => {
  const actorRole = normalizeRole(req.user?.role);
  const visible = getVisibleUserRoles(actorRole);

  if (!visible.length) {
    return res.status(403).json({
      success: false,
      message: "Forbidden: you cannot list users",
    });
  }

  const query = { role: buildVisibleRolesFilter(actorRole) };
  const { role: roleFilter } = req.query;

  if (roleFilter) {
    const requested = normalizeRole(roleFilter);
    if (!visible.includes(requested)) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: you cannot view users in that role",
      });
    }
    const variants = getRoleQueryVariants(requested);
    query.role = {
      $in: variants.map(
        (v) => new RegExp(`^${v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i")
      ),
    };
  }

  const users = await User.find(query).select("-password").sort({ createdAt: -1 });
  const data = users.map((u) => ({
    ...u.toObject(),
    role: normalizeRole(u.role),
  }));

  res.status(200).json({ success: true, count: data.length, data });
});

/** List users with isOnline=true and select presence fields — super admin only */
const getOnlineUsers = AsyncHandler(async (req, res) => {
  const actorRole = normalizeRole(req.user?.role);
  if (!isSuperAdmin(actorRole)) {
    return res.status(403).json({
      success: false,
      message: "Only super admin can view online users",
    });
  }

  const onlineUsers = await User.find({ isOnline: true })
    .select("name email role status lastActive loginCount createdAt isOnline")
    .sort({ lastActive: -1 })
    .lean();

  const data = onlineUsers.map((u) => ({
    ...u,
    role: normalizeRole(u.role),
  }));

  res.status(200).json({ success: true, count: data.length, data });
});

/** List users by login presence — super admin only */
const getUsersByPresence = AsyncHandler(async (req, res) => {
  const actorRole = normalizeRole(req.user?.role);
  if (!isSuperAdmin(actorRole)) {
    return res.status(403).json({
      success: false,
      message: "Only super admin can view user presence",
    });
  }

  const status = String(req.query.status || "active").toLowerCase();
  if (!["active", "inactive"].includes(status)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid status. Use "active" or "inactive".',
    });
  }

  const isOnline = status === "active";
  const users = await User.find({ isOnline })
    .select("name email role status lastActive loginCount createdAt isOnline")
    .sort({ lastActive: -1 })
    .lean();

  const data = users.map((u) => ({
    ...u,
    role: normalizeRole(u.role),
  }));

  res.status(200).json({
    success: true,
    status,
    count: data.length,
    data,
  });
});

/** Return total user count (scoped to visible roles for domain admins) */
const totalUserCount = AsyncHandler(async (req, res) => {
  const actorRole = normalizeRole(req.user?.role);
  const visible = getVisibleUserRoles(actorRole);

  if (!visible.length) {
    return res.status(403).json({
      success: false,
      message: "Forbidden",
    });
  }

  const count = isSuperAdmin(actorRole)
    ? await User.countDocuments()
    : await User.countDocuments({ role: buildVisibleRolesFilter(actorRole) });

  res.status(200).json({ success: true, count });
});

/** Return count of online users — super admin only */
const onlineUserCount = AsyncHandler(async (req, res) => {
  const actorRole = normalizeRole(req.user?.role);
  if (!isSuperAdmin(actorRole)) {
    return res.status(403).json({
      success: false,
      message: "Only super admin can view online user counts",
    });
  }

  const count = await User.countDocuments({ isOnline: true });
  res.status(200).json({ success: true, count });
});

/**
 * Logout current user (clear cookie if present and mark offline)
 */
const logout = AsyncHandler(async (req, res) => {
  try {
    // Set user offline before logging out
    const user = await User.findById(req.user._id);
    if (user) {
      await user.setOffline();
    }

    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });

    res.status(200).json({ success: true, message: "Logged out successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error during logout" });
  }
});

/**
 * Aggregated stats for current user across Evaluations and Escalations
 */
const getUserSubmissionStats = async (req, res) => {
  try {
    const userId = req.user._id;

    const userStats = await User.aggregate([
      {
        $match: { _id: userId },
      },
      {
        $lookup: {
          from: "evaluations",
          localField: "_id",
          foreignField: "userId",
          as: "evaluations",
        },
      },
      {
        $lookup: {
          from: "escalations",
          localField: "_id",
          foreignField: "userId",
          as: "escalations",
        },
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
            $add: [{ $size: "$evaluations" }, { $size: "$escalations" }],
          },
        },
      },
    ]);

    if (userStats.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      data: userStats[0],
    });
  } catch (error) {
    console.error("Error fetching user submission stats:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/** Aggregated stats for all users (Super Admin only) */
const getAllUsersSubmissionStats = async (req, res) => {
  try {
    if (!isSuperAdmin(req.user?.role)) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: Super Admin access required",
      });
    }

    const usersStats = await User.aggregate([
      {
        $lookup: {
          from: "evaluations",
          localField: "_id",
          foreignField: "userId",
          as: "evaluations",
        },
      },
      {
        $lookup: {
          from: "escalations",
          localField: "_id",
          foreignField: "userId",
          as: "escalations",
        },
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
            $add: [{ $size: "$evaluations" }, { $size: "$escalations" }],
          },
        },
      },
      {
        $sort: { totalSubmissions: -1 },
      },
    ]);

    res.status(200).json({
      success: true,
      data: usersStats,
      totalUsers: usersStats.length,
    });
  } catch (error) {
    console.error("Error fetching all users submission stats:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });

    const actorRole = normalizeRole(req.user?.role);
    const isSelf = String(req.user._id) === String(user._id);

    if (!isSelf && !canManageRole(actorRole, user.role)) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: you cannot view this user",
      });
    }

    res.json({
      success: true,
      data: { ...user.toObject(), role: normalizeRole(user.role) },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// UPDATE user (PUT = full replace) — Super Admin or domain admin for managed roles
const updateUser = async (req, res) => {
  try {
    const target = await User.findById(req.params.id);
    if (!target) return res.status(404).json({ message: "User not found" });

    const actorRole = normalizeRole(req.user?.role);
    if (!canManageRole(actorRole, target.role)) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: you cannot update this user",
      });
    }

    const body = { ...req.body };
    delete body.password;

    if (body.role !== undefined && !canManageRole(actorRole, body.role)) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: you cannot assign that role",
      });
    }

    const updated = await User.findByIdAndUpdate(req.params.id, body, {
      new: true,
      runValidators: true,
    }).select("-password");

    res.json({
      success: true,
      data: { ...updated.toObject(), role: normalizeRole(updated.role) },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// PATCH user — self (limited fields) or manager for managed roles
const patchUser = async (req, res) => {
  try {
    const { id } = req.params;

    if (!req.user) {
      return res
        .status(401)
        .json({ success: false, message: "Not authorized" });
    }

    const target = await User.findById(id);
    if (!target) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const actorRole = normalizeRole(req.user.role);
    const isSelf = String(req.user._id) === String(id);
    const canManage = canManageRole(actorRole, target.role);

    if (!isSelf && !canManage) {
      return res.status(403).json({
        success: false,
        message: "You can only update your own account",
      });
    }

    let body = { ...req.body };
    delete body._id;
    delete body.__v;

    if (body.password !== undefined && body.password !== "") {
      if (!canManage && !(isSelf && isUserManager(actorRole))) {
        delete body.password;
      } else if (String(body.password).length < 8) {
        return res.status(400).json({
          success: false,
          message: "Password must be at least 8 characters",
        });
      } else {
        body.password = await hashPassword(body.password);
      }
    } else {
      delete body.password;
    }

    if (isSelf && !isUserManager(actorRole)) {
      const safe = {};
      ["name", "email"].forEach((k) => {
        if (body[k] !== undefined) safe[k] = body[k];
      });
      body = safe;
    }

    if (body.role !== undefined) {
      if (!canManage || !canManageRole(actorRole, body.role)) {
        return res.status(403).json({
          success: false,
          message: "Forbidden: you cannot change role to that value",
        });
      }
    }

    const updated = await User.findByIdAndUpdate(
      id,
      { $set: body },
      { new: true, runValidators: true }
    ).select("-password");

    res.json({
      success: true,
      data: { ...updated.toObject(), role: normalizeRole(updated.role) },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE user — Super Admin or domain admin for managed roles only
const deleteUser = async (req, res) => {
  try {
    const target = await User.findById(req.params.id);
    if (!target) return res.status(404).json({ message: "User not found" });

    const actorRole = normalizeRole(req.user?.role);
    if (!canManageRole(actorRole, target.role)) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: you cannot delete this user",
      });
    }

    if (String(req.user._id) === String(target._id)) {
      return res.status(400).json({
        success: false,
        message: "You cannot delete your own account",
      });
    }

    await User.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  registerUser,
  signupUser,
  loginUser,
  findMyProfile,
  updateUserStatus,
  updateUserActivity,
  setUserOnline,
  setUserOffline,
  getAllUsers,
  getOnlineUsers,
  getUsersByPresence,
  totalUserCount,
  onlineUserCount,
  logout,
  getUserSubmissionStats,
  getAllUsersSubmissionStats,
  getUserById,
  patchUser,
  deleteUser,
  updateUser,
};
