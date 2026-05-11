const Evaluation = require("../models/Evaluation");
const Escalation = require("../models/Escalation");

// Get low rating calls
const getLowRatingCalls = async (req, res) => {
  try {
    const { agentName } = req.query;

    let query = {
      rating: { $lt: 40 },
      mod: "Call",
    };

    if (agentName) {
      query.agentName = agentName;
    }

    const calls = await Evaluation.find(query).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: calls.length,
      data: calls,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get low rating chats
const getLowRatingChats = async (req, res) => {
  try {
    const { agentName } = req.query;

    let query = {
      rating: { $lt: 40 },
      mod: "Chat",
    };

    if (agentName) {
      query.agentName = agentName;
    }

    const chats = await Evaluation.find(query).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: chats.length,
      data: chats,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get agent dashboard data
const getAgentDashboard = async (req, res) => {
  try {
    const { agentName } = req.params;

    if (!agentName) {
      return res.status(400).json({
        success: false,
        message: "Agent name is required",
      });
    }

    console.log("📊 Fetching dashboard for:", agentName);

    // Fetch evaluations and escalations in parallel
    const [evaluations, escalations] = await Promise.all([
      Evaluation.find({ agentName }).sort({ createdAt: -1 }),
      Escalation.find({
        $or: [{ agentName }, { useremail: agentName }],
      }).sort({ createdAt: -1 }),
    ]);

    console.log("✅ Found evaluations:", evaluations.length);
    console.log("✅ Found escalations:", escalations.length);

    // Calculate metrics
    const totalEvaluations = evaluations.length;
    const totalPoints = evaluations.reduce(
      (sum, eval) => sum + Number(eval.rating || 0),
      0
    );
    const averageRating =
      totalEvaluations > 0 ? (totalPoints / totalEvaluations).toFixed(2) : 0;

    // Escalation metrics
    const totalEscalations = escalations.length;
    const completedEscalations = escalations.filter(
      (esc) => esc.leadStatus === "Completed" || esc.leadStatus === "Resolved"
    ).length;
    const pendingEscalations = totalEscalations - completedEscalations;
    const escalationRate =
      totalEscalations > 0
        ? Math.round((pendingEscalations / totalEscalations) * 100)
        : 0;

    // Weekly performance (last 7 days)
    const weeklyData = calculateWeeklyPerformance(evaluations);

    // Low rating items
    const lowRatingCalls = evaluations.filter(
      (e) => e.rating < 40 && e.mod === "Call"
    ).length;
    const lowRatingChats = evaluations.filter(
      (e) => e.rating < 40 && e.mod === "Chat"
    ).length;

    res.status(200).json({
      success: true,
      data: {
        agentName,
        evaluations: {
          total: totalEvaluations,
          totalPoints,
          averageRating,  
          lowRatingCalls,
          lowRatingChats,
        },
        escalations: {
          total: totalEscalations,
          completed: completedEscalations,
          pending: pendingEscalations,
          escalationRate,
        },
        weeklyPerformance: weeklyData,
        recentEvaluations: evaluations.slice(0, 5),
        recentEscalations: escalations.slice(0, 5),
      },
    });
  } catch (error) {
    console.error("❌ Dashboard error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Helper function to calculate weekly performance
const calculateWeeklyPerformance = (evaluations) => {
  const now = new Date();
  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(now.getDate() - i);
    return date;
  }).reverse();

  const dailyCounts = last7Days.map((date) => {
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);

    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    return evaluations.filter((evaluation) => {
      const evalDate = new Date(evaluation.date || evaluation.createdAt);
      return evalDate >= dayStart && evalDate <= dayEnd;
    }).length;
  });

  const dayLabels = last7Days.map((date) => daysOfWeek[date.getDay()]);

  return { labels: dayLabels, data: dailyCounts };
};

// Get agent performance trends
const getAgentTrends = async (req, res) => {
  try {
    const { agentName } = req.params;
    const { period = 30 } = req.query; // Default 30 days

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period));

    const evaluations = await Evaluation.find({
      agentName,
      createdAt: { $gte: startDate },
    }).sort({ createdAt: 1 });

    res.status(200).json({
      success: true,
      data: evaluations,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  getLowRatingCalls,
  getLowRatingChats,
  getAgentDashboard,
  getAgentTrends,
};
