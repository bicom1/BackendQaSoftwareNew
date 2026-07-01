/**
 * Application entrypoint
 * - Loads environment, connects MongoDB and Redis
 * - Boots Express with security middleware and CORS
 * - Mounts feature routes (users, evaluations, escalations, marketing, analytics, Bitrix24)
 * - Initializes and exposes cron jobs management endpoints
 */

require("dotenv").config();
const express = require("express");
const path = require("path");
const colors = require("colors");
const helmet = require("helmet");
const cors = require("cors");
const mongoose = require("mongoose");
const qcDashboardRoutes = require("./routes/qcDashboardRoutes");

// Config
const { validateEnv } = require("./config/env");
const connectDB = require("./config/db");
const redisClient = require("./config/redis");

// Middleware
const requestLogger = require("./middlewares/logger");
const errorHandler = require("./middlewares/errorHandler");

// Express init
const app = express();
const PORT = process.env.PORT || 3001;

// Validate environment variables
validateEnv();

// Middleware
app.use(helmet());
app.use(
  cors({
    origin: [
      "http://localhost:5173", // Local frontend
      "https://front-qa-software-new.vercel.app", // Production frontend
    ],
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(requestLogger);
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// Routes
app.use("/api/users", require("./routes/userRoutes"));
app.use("/api/bitrix24", require("./routes/bitrix24Routes"));
app.use("/api/evaluations", require("./routes/evaluationRoutes"));
app.use("/api/escalations", require("./routes/escalationRoutes"));
app.use("/api/marketing", require("./routes/marketingRoutes"));
app.use("/api/teamlead", require("./routes/teamleadRoutes"));
app.use("/api/departments", require("./routes/departmentRoutes"));
app.use("/api/analytics", require("./routes/analyticsRoutes"));
app.use("/api/agents", require("./routes/agentsRoutes"));
app.use("/api/feedback", require("./routes/feedbackRoutes"));
app.use("/api", qcDashboardRoutes);

app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    database:
      mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    redis: redisClient.isOpen ? "connected" : "disconnected",
  });
});

// Root endpoint
app.get("/", (req, res) => {
  res.send("Bitrix24 API Caller Service is Running!");
});

// 404 handler for unknown routes
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.originalUrl}`,
  });
});

// Global error handler
app.use(errorHandler);

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("\n🛑 Shutting down gracefully...".yellow);
  try {
    await mongoose.connection.close();
    await redisClient.quit();
    console.log("✅ All connections closed. Goodbye!".green);
    process.exit(0);
  } catch (err) {
    console.error("❌ Error during shutdown:".red, err);
    process.exit(1);
  }
});

// Catch unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  console.error("⚠️ Unhandled Promise Rejection:", reason);
});

// Catch uncaught exceptions
process.on("uncaughtException", (err) => {
  console.error("💣 Uncaught Exception:", err);
  process.exit(1); // safest option to avoid unknown state
});

(async function start() {
  try {
    await connectDB();
    await redisClient.connect();
    console.log("✅ MongoDB & Redis connected".green);

    const { verifyEmailConnection } = require("./services/emailService");
    const emailStatus = await verifyEmailConnection();
    if (emailStatus.ok) {
      console.log(`✅ Email SMTP ready (${emailStatus.mode})`.green);
    } else {
      console.warn(
        `⚠️  Email SMTP not working: ${emailStatus.message}`.yellow
      );
      console.warn(
        "   Password-reset OTP will NOT send until EMAIL_USER/EMAIL_PASSWORD are fixed."
          .yellow
      );
      console.warn(
        "   Test with: node scripts/test-smtp.js your@email.com".yellow
      );
    }

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${String(PORT).bgWhite}`.yellow);
    });
  } catch (err) {
    console.error("❌ Failed to initialize services (MongoDB or Redis):", err);
    process.exit(1);
  }
})();

module.exports = { app, redisClient };
