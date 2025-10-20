import User from "../models/usermodel.js";
import Evaluation from "../models/Evaluation.js";
import Escalation from "../models/Escalation.js";
import Marketing from "../models/Marketing.js";

// Helper to convert range param to MongoDB date filter
const getDateFilter = (range) => {
  const now = new Date();
  let from;

  switch (range) {
    case "7d":
      from = new Date(now.setDate(now.getDate() - 7));
      break;
    case "30d":
      from = new Date(now.setDate(now.getDate() - 30));
      break;
    case "month":
      from = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case "quarter":
      const currentMonth = now.getMonth();
      const quarterStartMonth = currentMonth - (currentMonth % 3);
      from = new Date(now.getFullYear(), quarterStartMonth, 1);
      break;
    default:
      return {}; // no filter
  }

  return { createdAt: { $gte: from } };
};

/** ===============================
 *  📊 Overview Analytics
 *  =============================== */
export const getOverviewAnalytics = async (req, res) => {
  try {
    const range = req.query.range || "";
    const filter = getDateFilter(range);

    const totalUsers = await User.countDocuments();

    // Evaluations
    const evalTotal = await Evaluation.countDocuments(filter);

    const evalAvgResult = await Evaluation.aggregate([
      { $match: filter },
      { $group: { _id: null, avgRating: { $avg: "$rating" } } },
    ]);
    const evalAvg = evalAvgResult[0]?.avgRating || 0;

    const modCountAgg = await Evaluation.aggregate([
      { $match: filter },
      { $group: { _id: "$mod", count: { $sum: 1 } } },
    ]);
    const modCounts = Object.fromEntries(
      modCountAgg.map((i) => [i._id, i.count])
    );

    const ratingRangeAgg = await Evaluation.aggregate([
      { $match: filter },
      {
        $bucket: {
          groupBy: "$rating",
          boundaries: [0, 50, 80, 101],
          default: "Other",
          output: { count: { $sum: 1 } },
        },
      },
    ]);
    const ratingRanges = { "0-49": 0, "50-79": 0, "80-100": 0 };
    ratingRangeAgg.forEach((r) => {
      if (r._id === 0) ratingRanges["0-49"] = r.count;
      else if (r._id === 50) ratingRanges["50-79"] = r.count;
      else if (r._id === 80) ratingRanges["80-100"] = r.count;
    });

    const latestEvaluations = await Evaluation.find(filter)
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    // Escalations
    const escTotal = await Escalation.countDocuments(filter);

    const severityAgg = await Escalation.aggregate([
      { $match: filter },
      {
        $group: {
          _id: { $ifNull: ["$escSeverity", "Unknown"] },
          count: { $sum: 1 },
        },
      },
    ]);
    const severityCounts = Object.fromEntries(
      severityAgg.map((i) => [i._id, i.count])
    );

    const issueAgg = await Escalation.aggregate([
      { $match: filter },
      {
        $group: {
          _id: {
            $ifNull: [
              { $ifNull: ["$issueIden", "$issueidentification"] },
              "Unknown",
            ],
          },
          count: { $sum: 1 },
        },
      },
    ]);
    const issueCounts = Object.fromEntries(
      issueAgg.map((i) => [i._id, i.count])
    );

    const latestEscalations = await Escalation.find(filter)
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    // Marketing
    const marketingTotal = await Marketing.countDocuments(filter);

    const qualityAgg = await Marketing.aggregate([
      { $match: filter },
      {
        $group: {
          _id: { $ifNull: ["$leadQuality", "Unknown"] },
          count: { $sum: 1 },
        },
      },
    ]);
    const qualityCounts = Object.fromEntries(
      qualityAgg.map((i) => [i._id, i.count])
    );

    const sourceAgg = await Marketing.aggregate([
      { $match: filter },
      {
        $group: {
          _id: { $ifNull: ["$source", "Unknown"] },
          count: { $sum: 1 },
        },
      },
    ]);
    const sourceCounts = Object.fromEntries(
      sourceAgg.map((i) => [i._id, i.count])
    );

    const latestMarketing = await Marketing.find(filter)
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    res.json({
      totalUsers,
      evaluations: {
        total: evalTotal,
        avgRating: evalAvg,
        modCounts,
        ratingRanges,
        latestEvaluations,
      },
      escalations: {
        total: escTotal,
        severityCounts,
        issueCounts,
        latestEscalations,
      },
      marketing: {
        total: marketingTotal,
        qualityCounts,
        sourceCounts,
        latestMarketing,
      },
    });
  } catch (error) {
    console.error("Analytics error:", error.message);
    res
      .status(500)
      .json({ message: "Failed to load analytics", error: error.message });
  }
};

/** ===============================
 *  🧾 Evaluation Analytics
 *  =============================== */
export const getEvaluationAnalytics = async (req, res) => {
  try {
    const total = await Evaluation.countDocuments();

    const avgResult = await Evaluation.aggregate([
      { $group: { _id: null, avgRating: { $avg: "$rating" } } },
    ]);
    const avgRating = avgResult[0]?.avgRating || 0;

    const modAgg = await Evaluation.aggregate([
      { $group: { _id: "$mod", count: { $sum: 1 } } },
    ]);
    const modCounts = Object.fromEntries(modAgg.map((i) => [i._id, i.count]));

    const ratingAgg = await Evaluation.aggregate([
      {
        $bucket: {
          groupBy: "$rating",
          boundaries: [0, 50, 80, 101],
          default: "Other",
          output: { count: { $sum: 1 } },
        },
      },
    ]);
    const ratingRanges = { "0-49": 0, "50-79": 0, "80-100": 0 };
    ratingAgg.forEach((r) => {
      if (r._id === 0) ratingRanges["0-49"] = r.count;
      else if (r._id === 50) ratingRanges["50-79"] = r.count;
      else if (r._id === 80) ratingRanges["80-100"] = r.count;
    });

    const latestEvaluations = await Evaluation.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    res.json({ total, avgRating, modCounts, ratingRanges, latestEvaluations });
  } catch (error) {
    console.error("Evaluation analytics error:", error.message);
    res.status(500).json({ message: "Evaluation analytics failed" });
  }
};

/** ===============================
 *  🚨 Escalation Analytics
 *  =============================== */
export const getEscalationAnalytics = async (req, res) => {
  try {
    console.log("Fetching Escalation analytics...");

    const total = await Escalation.countDocuments();
    console.log("Total Escalations:", total);

    const severityAgg = await Escalation.aggregate([
      {
        $group: {
          _id: { $ifNull: ["$escSeverity", "Unknown"] },
          count: { $sum: 1 },
        },
      },
    ]);
    const severityCounts = Object.fromEntries(
      severityAgg.map((i) => [i._id, i.count])
    );

    const issueAgg = await Escalation.aggregate([
      {
        $group: {
          _id: {
            $ifNull: [
              { $ifNull: ["$issueIden", "$issueidentification"] },
              "Unknown",
            ],
          },
          count: { $sum: 1 },
        },
      },
    ]);
    const issueCounts = Object.fromEntries(
      issueAgg.map((i) => [i._id, i.count])
    );

    const latestEscalations = await Escalation.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    console.log("Latest Escalations fetched:", latestEscalations.length);

    res.json({ total, severityCounts, issueCounts, latestEscalations });
  } catch (error) {
    console.error("Escalation analytics error:", error);
    res
      .status(500)
      .json({ message: "Escalation analytics failed", error: error.message });
  }
};

/** ===============================
 *  📈 Marketing Analytics
 *  =============================== */
export const getMarketingAnalytics = async (req, res) => {
  try {
    const total = await Marketing.countDocuments();

    const qualityAgg = await Marketing.aggregate([
      {
        $group: {
          _id: { $ifNull: ["$leadQuality", "Unknown"] },
          count: { $sum: 1 },
        },
      },
    ]);
    const qualityCounts = Object.fromEntries(
      qualityAgg.map((i) => [i._id, i.count])
    );

    const sourceAgg = await Marketing.aggregate([
      {
        $group: {
          _id: { $ifNull: ["$source", "Unknown"] },
          count: { $sum: 1 },
        },
      },
    ]);
    const sourceCounts = Object.fromEntries(
      sourceAgg.map((i) => [i._id, i.count])
    );

    const latestMarketing = await Marketing.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    res.json({ total, qualityCounts, sourceCounts, latestMarketing });
  } catch (error) {
    console.error("Marketing analytics error:", error.message);
    res.status(500).json({ message: "Marketing analytics failed" });
  }
};

/** ===============================
 *  🧑‍💼 Agent Form Submits (Top 5)
 *  =============================== */
export const agentFormSubmits = async (req, res) => {
  try {
    const data = await Evaluation.aggregate([
      { $group: { _id: "$agentName", formSubmit: { $sum: 1 } } },
      { $sort: { formSubmit: -1 } },
      { $limit: 5 },
    ]);

    const formatted = data.map((item) => ({
      agentName: item._id || "Unknown",
      formSubmit: item.formSubmit,
    }));

    res.json({ success: true, data: formatted });
  } catch (err) {
    console.error("Agent form submit analytics error:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};
