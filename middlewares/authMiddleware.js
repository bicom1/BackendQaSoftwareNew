const jwt = require("jsonwebtoken");
const AsyncHandler = require("express-async-handler");
const User = require("../models/usermodel");

const authMiddleware = AsyncHandler(async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer ")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];

      // Decode and verify the token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get user ID from token
      const userId = decoded.id;
      if (!userId) {
        res.status(401);
        throw new Error("Invalid token payload (no user id)");
      }

      // Fetch user details from DB (excluding password)
      req.user = await User.findById(userId).select("-password");

      if (!req.user) {
        res.status(401);
        throw new Error("User not found");
      }

      // Attach token payload too (so you can access name/email if signed)
      req.userPayload = decoded;

      next();
    } catch (error) {
      console.error("Auth Error:", error.message);
      res.status(401);
      throw new Error("Invalid or expired token");
    }
  } else {
    res.status(401);
    throw new Error("No token provided");
  }
});

module.exports = authMiddleware;
