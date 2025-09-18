// Aggregated analytics across Users, Evaluations, Escalations, and Marketing
const User = require('../models/usermodel');
const Evaluation = require('../models/Evaluation');
const Escalation = require('../models/Escalation');
const Marketing = require('../models/Marketing');

// Helper to convert range param to MongoDB date filter
const getDateFilter = (range) => {
  const now = new Date();
  let from;

  switch (range) {
    case '7d':
      from = new Date(now.setDate(now.getDate() - 7));
      break;
    case '30d':
      from = new Date(now.setDate(now.getDate() - 30));
      break;
    case 'month':
      from = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case 'quarter':
      const currentMonth = now.getMonth();
      const quarterStartMonth = currentMonth - (currentMonth % 3);
      from = new Date(now.getFullYear(), quarterStartMonth, 1);
      break;
    default:
      return {}; // no filter
  }

  return { createdAt: { $gte: from } };
};

/**
 * GET /api/analytics/overview?range=7d|30d|month|quarter
 * Returns top-level KPIs and small samples for dashboard cards.
 */
exports.getOverviewAnalytics = async (req, res) => {
  try {
    const range = req.query.range || ''; // optional
    const filter = getDateFilter(range);

    const totalUsers = await User.countDocuments();

    // Evaluations
    const evalTotal = await Evaluation.countDocuments(filter);

    const evalAvgResult = await Evaluation.aggregate([
      { $match: filter },
      { $group: { _id: null, avgRating: { $avg: "$rating" } } }
    ]);
    const evalAvg = evalAvgResult[0]?.avgRating || 0;

    const modCountAgg = await Evaluation.aggregate([
      { $match: filter },
      { $group: { _id: "$mod", count: { $sum: 1 } } }
    ]);
    const modCounts = Object.fromEntries(modCountAgg.map(i => [i._id, i.count]));

    const ratingRangeAgg = await Evaluation.aggregate([
      { $match: filter },
      {
        $bucket: {
          groupBy: "$rating",
          boundaries: [0, 50, 80, 101],
          default: "Other",
          output: { count: { $sum: 1 } }
        }
      }
    ]);
    const ratingRanges = { '0-49': 0, '50-79': 0, '80-100': 0 };
    ratingRangeAgg.forEach(r => {
      if (r._id === 0) ratingRanges['0-49'] = r.count;
      else if (r._id === 50) ratingRanges['50-79'] = r.count;
      else if (r._id === 80) ratingRanges['80-100'] = r.count;
    });

    const latestEvaluations = await Evaluation.find(filter).sort({ createdAt: -1 }).limit(5);

    // Escalations
    const escTotal = await Escalation.countDocuments(filter);

    const severityAgg = await Escalation.aggregate([
      { $match: filter },
      { $group: { _id: "$escSeverity", count: { $sum: 1 } } }
    ]);
    const severityCounts = Object.fromEntries(severityAgg.map(i => [i._id, i.count]));

    const issueAgg = await Escalation.aggregate([
      { $match: filter },
      {
        $group: {
          _id: { $ifNull: ["$issueIden", "$issueidentification"] },
          count: { $sum: 1 }
        }
      }
    ]);
    const issueCounts = Object.fromEntries(issueAgg.map(i => [i._id, i.count]));

    const latestEscalations = await Escalation.find(filter).sort({ createdAt: -1 }).limit(5);

    // Marketing
    const marketingTotal = await Marketing.countDocuments(filter);

    const qualityAgg = await Marketing.aggregate([
      { $match: filter },
      { $group: { _id: "$leadQuality", count: { $sum: 1 } } }
    ]);
    const qualityCounts = Object.fromEntries(qualityAgg.map(i => [i._id, i.count]));

    const sourceAgg = await Marketing.aggregate([
      { $match: filter },
      { $group: { _id: "$source", count: { $sum: 1 } } }
    ]);
    const sourceCounts = Object.fromEntries(sourceAgg.map(i => [i._id, i.count]));

    const latestMarketing = await Marketing.find(filter).sort({ createdAt: -1 }).limit(5);

    // Final Response
    res.json({
      totalUsers,
      evaluations: {
        total: evalTotal,
        avgRating: evalAvg,
        modCounts,
        ratingRanges,
        latestEvaluations
      },
      escalations: {
        total: escTotal,
        severityCounts,
        issueCounts,
        latestEscalations
      },
      marketing: {
        total: marketingTotal,
        qualityCounts,
        sourceCounts,
        latestMarketing
      }
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ message: 'Failed to load analytics' });
  }
};

/** Detailed evaluation analytics (counts, average, distributions) */
exports.getEvaluationAnalytics = async (req, res) => {
    try {
      const total = await Evaluation.countDocuments();
      const avgResult = await Evaluation.aggregate([
        { $group: { _id: null, avgRating: { $avg: "$rating" } } }
      ]);
      const avgRating = avgResult[0]?.avgRating || 0;
  
      const modAgg = await Evaluation.aggregate([
        { $group: { _id: "$mod", count: { $sum: 1 } } }
      ]);
      const modCounts = Object.fromEntries(modAgg.map(i => [i._id, i.count]));
  
      const ratingAgg = await Evaluation.aggregate([
        {
          $bucket: {
            groupBy: "$rating",
            boundaries: [0, 50, 80, 101],
            default: "Other",
            output: { count: { $sum: 1 } }
          }
        }
      ]);
      const ratingRanges = { '0-49': 0, '50-79': 0, '80-100': 0 };
      ratingAgg.forEach(r => {
        if (r._id === 0) ratingRanges['0-49'] = r.count;
        else if (r._id === 50) ratingRanges['50-79'] = r.count;
        else if (r._id === 80) ratingRanges['80-100'] = r.count;
      });
  
      const latestEvaluations = await Evaluation.find().sort({ createdAt: -1 }).limit(5);
  
      res.json({ total, avgRating, modCounts, ratingRanges, latestEvaluations });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Evaluation analytics failed' });
    }
  };
  
  // /api/analytics/escalations
  /** Severity, issue distribution, and latest escalations */
  exports.getEscalationAnalytics = async (req, res) => {
    try {
      const total = await Escalation.countDocuments();
  
      const severityAgg = await Escalation.aggregate([
        { $group: { _id: "$escSeverity", count: { $sum: 1 } } }
      ]);
      const severityCounts = Object.fromEntries(severityAgg.map(i => [i._id, i.count]));
  
      const issueAgg = await Escalation.aggregate([
        {
          $group: {
            _id: { $ifNull: ["$issueIden", "$issueidentification"] },
            count: { $sum: 1 }
          }
        }
      ]);
      const issueCounts = Object.fromEntries(issueAgg.map(i => [i._id, i.count]));
  
      const latestEscalations = await Escalation.find().sort({ createdAt: -1 }).limit(5);
  
      res.json({ total, severityCounts, issueCounts, latestEscalations });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Escalation analytics failed' });
    }
  };
  
  // /api/analytics/marketing
  /** Lead quality and source distributions and latest items */
  exports.getMarketingAnalytics = async (req, res) => {
    try {
      const total = await Marketing.countDocuments();
  
      const qualityAgg = await Marketing.aggregate([
        { $group: { _id: "$leadQuality", count: { $sum: 1 } } }
      ]);
      const qualityCounts = Object.fromEntries(qualityAgg.map(i => [i._id, i.count]));
  
      const sourceAgg = await Marketing.aggregate([
        { $group: { _id: "$source", count: { $sum: 1 } } }
      ]);
      const sourceCounts = Object.fromEntries(sourceAgg.map(i => [i._id, i.count]));
  
      const latestMarketing = await Marketing.find().sort({ createdAt: -1 }).limit(5);
  
      res.json({ total, qualityCounts, sourceCounts, latestMarketing });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Marketing analytics failed' });
    }
  };

//  exports.agentFormSubmits = async (req, res) => {
//   try {
//     const data = await Evaluation.aggregate([
//       {
//         $group: {
//           _id: "$agentName", // group by agent name field
//           formSubmit: { $sum: 1 } // count number of submissions
//         }
//       },
//       { $sort: { formSubmit: -1 } }
//       { $limit: 5 }  // sort highest first
//     ]);

//     // Format for frontend (agentName + formSubmit)
//     const formatted = data.map(item => ({
//       agentName: item._id,
//       formSubmit: item.formSubmit
//     }));

//     res.json({ success: true, data: formatted });
//   } catch (err) {
//     res.status(500).json({ success: false, message: err.message });
//   }
// };

 exports.agentFormSubmits =  async (req, res) => {
  try {
    const data = await Evaluation.aggregate([
      {
        $group: {
          _id: "$agentName", // group by agent
          formSubmit: { $sum: 1 } // count submissions
        }
      },
      { $sort: { formSubmit: -1 } }, // sort by highest
      { $limit: 5 } // take only top 5
    ]);

    const formatted = data.map(item => ({
      agentName: item._id,
      formSubmit: item.formSubmit
    }));

    res.json({ success: true, data: formatted });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
