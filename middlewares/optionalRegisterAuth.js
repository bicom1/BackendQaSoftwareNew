const jwt = require("jsonwebtoken");
const User = require("../models/usermodel");
const {
  normalizeRole,
  isSuperAdmin,
  isAgentAdmin,
  isQcAdmin,
  getRoleQueryVariants,
} = require("../helpers/roles");

const isPublicRegisterAllowed = () =>
  process.env.ALLOW_PUBLIC_REGISTER === "true";

const hasAnySuperAdmin = async () => {
  const variants = [
    ...getRoleQueryVariants("superadmin"),
    "admin",
    "super admin",
  ];
  const count = await User.countDocuments({
    role: { $in: variants },
  });
  return count > 0;
};

const isUserManagerRole = (role) => {
  const r = normalizeRole(role);
  return isSuperAdmin(r) || isAgentAdmin(r) || isQcAdmin(r);
};

/**
 * POST /register-user auth:
 * - Bootstrap (no token): ALLOW_PUBLIC_REGISTER or empty DB / no super admin
 * - With token: Super Admin, Agent Admin, or QC Admin (domain-limited in controller)
 */
const optionalRegisterAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];
    if (token && token !== "null" && token !== "undefined") {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select("-password");
        if (user && isUserManagerRole(user.role)) {
          req.user = user;
          req.registerMode = "admin";
          return next();
        }
      } catch {
        // fall through
      }
    }
  }

  const userCount = await User.countDocuments();
  const bootstrap = userCount === 0 || !(await hasAnySuperAdmin());

  if (isPublicRegisterAllowed() || bootstrap) {
    req.registerMode = "bootstrap";
    return next();
  }

  return res.status(401).json({
    success: false,
    code: "NO_TOKEN",
    message:
      "No token provided. Log in as Super Admin / Agent Admin / QC Admin, or set ALLOW_PUBLIC_REGISTER=true for bootstrap.",
  });
};

module.exports = optionalRegisterAuth;
