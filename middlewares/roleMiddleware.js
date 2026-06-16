const { normalizeRole } = require("../helpers/roles");

const authorizeRoles =
  (...allowedRoles) =>
  (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Not authorized",
      });
    }

    const userRole = normalizeRole(req.user.role);
    const allowed = allowedRoles.map((r) => normalizeRole(r));

    if (!allowed.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: insufficient permissions",
      });
    }

    next();
  };

module.exports = { authorizeRoles };
