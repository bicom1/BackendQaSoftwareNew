const mongoose = require("mongoose");
const QcEvaluation = require("../models/qcEvaluationModel");
const User = require("../models/usermodel");

// ==============================
// 📊 GET QC DASHBOARD
// ==============================
exports.getQcDashboard = async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    const user = await User.findById(userId).select("name role email");
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // --- Date setup ---
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    // --- Stats ---
    const evaluationsToday = await QcEvaluation.countDocuments({
      qcUser: userId,
      createdAt: { $gte: today },
    });

    const escalationsPending = await QcEvaluation.countDocuments({
      qcUser: userId,
      escalated: true,
      status: { $in: ["escalated", "pending"] },
    });

    const totalReports = await QcEvaluation.countDocuments({ qcUser: userId });

    const ratingStats = await QcEvaluation.aggregate([
      { $match: { qcUser: new mongoose.Types.ObjectId(userId) } },
      {
        $group: {
          _id: null,
          avgRating: { $avg: "$rating" },
          totalEvaluations: { $sum: 1 },
        },
      },
    ]);

    const avgRating = ratingStats.length > 0 ? ratingStats[0].avgRating : 0;

    // --- Weekly Evaluations Data ---
    const weeklyData = await QcEvaluation.aggregate([
      {
        $match: {
          qcUser: new mongoose.Types.ObjectId(userId),
          createdAt: { $gte: weekAgo },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
          },
          evaluations: { $sum: 1 },
          escalations: {
            $sum: { $cond: [{ $eq: ["$escalated", true] }, 1, 0] },
          },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const formattedWeeklyData = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];
      const dayData = weeklyData.find((d) => d._id === dateStr);
      formattedWeeklyData.push({
        day: daysOfWeek[date.getDay()],
        date: dateStr,
        evaluations: dayData ? dayData.evaluations : 0,
        escalations: dayData ? dayData.escalations : 0,
      });
    }

    // --- Priority Distribution ---
    const priorityDist = await QcEvaluation.aggregate([
      { $match: { qcUser: new mongoose.Types.ObjectId(userId) } },
      { $group: { _id: "$priority", count: { $sum: 1 } } },
    ]);

    const priorityData = [
      {
        name: "High",
        value: priorityDist.find((p) => p._id === "high")?.count || 0,
        color: "#ef4444",
      },
      {
        name: "Medium",
        value: priorityDist.find((p) => p._id === "medium")?.count || 0,
        color: "#f59e0b",
      },
      {
        name: "Low",
        value: priorityDist.find((p) => p._id === "low")?.count || 0,
        color: "#22c55e",
      },
    ];

    // --- Status Distribution ---
    const statusDist = await QcEvaluation.aggregate([
      { $match: { qcUser: new mongoose.Types.ObjectId(userId) } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    const statusData = statusDist.map((s) => ({
      name: s._id.charAt(0).toUpperCase() + s._id.slice(1),
      value: s.count,
    }));

    // --- Recent Evaluations ---
    const recentEvaluations = await QcEvaluation.find({ qcUser: userId })
      .sort({ createdAt: -1 })
      .limit(5)
      .select("evaluationType rating status priority createdAt");

    // --- Performance Calculation ---
    const completedCount = await QcEvaluation.countDocuments({
      qcUser: userId,
      status: "completed",
    });

    const escalationRate =
      totalReports > 0 ? (escalationsPending / totalReports) * 100 : 0;
    const performanceScore = Math.round(
      avgRating * 20 - escalationRate + completedCount / 10
    );

    res.status(200).json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      stats: {
        evaluationsToday,
        escalationsPending,
        totalReports,
        avgRating: avgRating.toFixed(2),
        performanceScore,
        completionRate:
          totalReports > 0
            ? ((completedCount / totalReports) * 100).toFixed(1)
            : 0,
      },
      charts: {
        weeklyData: formattedWeeklyData,
        priorityData,
        statusData,
      },
      recentEvaluations,
    });
  } catch (error) {
    console.error("QC Dashboard Error:", error);
    res.status(500).json({ error: "Failed to load dashboard" });
  }
};

// ==============================
// 🏆 GET TOP PERFORMERS (ENHANCED WITH DEBUGGING)
// ==============================
exports.getTopPerformers = async (req, res) => {
  try {
    console.log("\n🔍 ===== FETCHING TOP PERFORMERS =====");

    // Get all users with QC role (try multiple role variations)
    const qcUsers = await User.find({
      role: { $in: ["qc", "QC", "quality", "Quality Control"] },
    }).select("_id name email role");

    console.log(`📊 Found ${qcUsers.length} QC users`);

    // If no QC users found, get ALL users
    let usersToProcess = qcUsers;
    if (!qcUsers || qcUsers.length === 0) {
      console.log("⚠️ No QC users found, fetching ALL users...");
      const allUsers = await User.find({}).select("_id name email role");
      console.log(`📋 Found ${allUsers.length} total users`);

      if (!allUsers || allUsers.length === 0) {
        console.log("❌ No users found in database at all!");
        return res.status(200).json({
          success: true,
          topPerformers: [],
          message: "No users found in database",
          debug: {
            totalUsers: 0,
            qcUsers: 0,
          },
        });
      }

      usersToProcess = allUsers;
    }

    // Get the database connection
    const db = mongoose.connection.db;

    // List all collections for debugging
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map((c) => c.name);
    console.log("📂 Available collections:", collectionNames.join(", "));

    // Calculate performance for each user
    const performersData = await Promise.all(
      usersToProcess.map(async (user) => {
        try {
          console.log(`\n👤 Processing: ${user.name} (${user.email})`);

          // Try evaluations collection
          let totalEvaluations = 0;
          try {
            totalEvaluations = await db
              .collection("evaluations")
              .countDocuments({
                $or: [
                  { email: user.email },
                  { agentEmail: user.email },
                  { useremail: user.email },
                  { evaluatedby: user.email },
                  { evaluatedBy: user.email },
                ],
              });
            console.log(`  ✅ Evaluations: ${totalEvaluations}`);
          } catch (e) {
            console.log(`  ⚠️ Evaluations collection error:`, e.message);
          }

          // Try escalations collection
          let totalEscalations = 0;
          try {
            totalEscalations = await db
              .collection("escalations")
              .countDocuments({
                $or: [
                  { email: user.email },
                  { agentEmail: user.email },
                  { useremail: user.email },
                  { escalatedby: user.email },
                  { escalatedBy: user.email },
                ],
              });
            console.log(`  ✅ Escalations: ${totalEscalations}`);
          } catch (e) {
            console.log(`  ⚠️ Escalations collection error:`, e.message);
          }

          // Try marketing collection (both singular and plural)
          let totalMarketing = 0;
          try {
            totalMarketing = await db.collection("marketings").countDocuments({
              $or: [
                { email: user.email },
                { useremail: user.email },
                { createdBy: user.email },
                { createdby: user.email },
              ],
            });
            console.log(`  ✅ Marketing (marketings): ${totalMarketing}`);
          } catch (e) {
            try {
              totalMarketing = await db.collection("marketing").countDocuments({
                $or: [
                  { email: user.email },
                  { useremail: user.email },
                  { createdBy: user.email },
                  { createdby: user.email },
                ],
              });
              console.log(`  ✅ Marketing (marketing): ${totalMarketing}`);
            } catch (e2) {
              console.log(`  ⚠️ Marketing collection not found`);
            }
          }

          // Count published items
          let publishedEvaluations = 0;
          let publishedEscalations = 0;

          try {
            publishedEvaluations = await db
              .collection("evaluations")
              .countDocuments({
                $or: [
                  { email: user.email },
                  { agentEmail: user.email },
                  { useremail: user.email },
                  { evaluatedby: user.email },
                  { evaluatedBy: user.email },
                ],
                status: "published",
              });
          } catch (e) {}

          try {
            publishedEscalations = await db
              .collection("escalations")
              .countDocuments({
                $or: [
                  { email: user.email },
                  { agentEmail: user.email },
                  { useremail: user.email },
                  { escalatedby: user.email },
                  { escalatedBy: user.email },
                ],
                status: "published",
              });
          } catch (e) {}

          const totalPublished = publishedEvaluations + publishedEscalations;
          const totalItems =
            totalEvaluations + totalEscalations + totalMarketing;

          console.log(
            `  📈 Total: ${totalItems}, Published: ${totalPublished}`
          );

          // Calculate metrics
          const completionRate =
            totalItems > 0 ? (totalPublished / totalItems) * 100 : 0;
          const escalationRate =
            totalItems > 0 ? (totalEscalations / totalItems) * 100 : 0;

          // Performance score calculation
          const performanceScore =
            totalEvaluations * 2 +
            totalMarketing * 1.5 -
            escalationRate * 0.5 +
            completionRate * 0.3;

          // Calculate average rating
          const avgRating = Math.min(5, 3 + (completionRate / 100) * 2);

          return {
            userId: user._id,
            name: user.name,
            email: user.email,
            totalEvaluations,
            totalEscalations,
            totalMarketing,
            totalItems,
            avgRating: parseFloat(avgRating.toFixed(2)),
            completionRate: parseFloat(completionRate.toFixed(2)),
            escalationRate: parseFloat(escalationRate.toFixed(2)),
            performanceScore: parseFloat(performanceScore.toFixed(2)),
          };
        } catch (err) {
          console.error(`❌ Error processing user ${user.email}:`, err.message);
          return {
            userId: user._id,
            name: user.name,
            email: user.email,
            totalEvaluations: 0,
            totalEscalations: 0,
            totalMarketing: 0,
            totalItems: 0,
            avgRating: 0,
            completionRate: 0,
            escalationRate: 0,
            performanceScore: 0,
          };
        }
      })
    );

    // Sort by performance score
    const topPerformers = performersData
      .sort((a, b) => b.performanceScore - a.performanceScore)
      .slice(0, 10);

    const activeUsers = topPerformers.filter((p) => p.totalItems > 0).length;

    console.log(
      `\n✅ Returning ${topPerformers.length} performers (${activeUsers} active)`
    );
    if (topPerformers.length > 0) {
      console.log(
        "🥇 Top performer:",
        topPerformers[0].name,
        "- Score:",
        topPerformers[0].performanceScore
      );
    }
    console.log("===== END TOP PERFORMERS =====\n");

    res.status(200).json({
      success: true,
      topPerformers,
      debug: {
        totalUsers: usersToProcess.length,
        qcUsers: qcUsers.length,
        activeUsers,
        collections: collectionNames,
      },
    });
  } catch (error) {
    console.error("❌ Top Performers Error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch top performers",
      details: error.message,
    });
  }
};

// ==============================
// 📝 CREATE EVALUATION
// ==============================
exports.createEvaluation = async (req, res) => {
  try {
    const {
      qcUser,
      evaluationType,
      priority,
      rating,
      findings,
      recommendations,
      escalated,
      escalationReason,
    } = req.body;

    if (!qcUser || !evaluationType || !rating || !findings) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const evaluation = new QcEvaluation({
      qcUser,
      evaluationType,
      priority: priority || "medium",
      rating,
      findings,
      recommendations,
      escalated: escalated || false,
      escalationReason,
      status: escalated ? "escalated" : "completed",
    });

    await evaluation.save();

    res.status(201).json({
      message: "Evaluation created successfully",
      evaluation,
    });
  } catch (error) {
    console.error("Create Evaluation Error:", error);
    res.status(500).json({ error: "Failed to create evaluation" });
  }
};

// ==============================
// 📜 GET EVALUATION HISTORY
// ==============================
exports.getEvaluationHistory = async (req, res) => {
  try {
    const { userId } = req.query;
    const { page = 1, limit = 10 } = req.query;

    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    const evaluations = await QcEvaluation.find({ qcUser: userId })
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const count = await QcEvaluation.countDocuments({ qcUser: userId });

    res.status(200).json({
      evaluations,
      totalPages: Math.ceil(count / limit),
      currentPage: Number(page),
      total: count,
    });
  } catch (error) {
    console.error("Evaluation History Error:", error);
    res.status(500).json({ error: "Failed to fetch evaluation history" });
  }
};
