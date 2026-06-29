import mongoose from "mongoose";
import { createRequire } from "module";
import evaluationQueue from "../queues/evaluationQueue.js";
import AsyncHandler from "express-async-handler";
import Evaluation from "../models/Evaluation.js";
import redisClient from "../config/redis.js";

const require = createRequire(import.meta.url);
const { mergeQueryWithQcScope } = require("../helpers/qcScope.js");

const createEvaluations = AsyncHandler(async (req, res) => {
  try {
    const payload = {
      ...req.query,
      ...req.body,
      audio: req.file ? req.file.path : null,
    };

    console.log("Webhook Payload:", payload);

    // Default value if not provided
    if (!payload.evaluatedby) {
      payload.evaluatedby = "";
    }
    if (!payload.useremail) {
      payload.useremail = "";
    }

    payload.status = "published";
    payload.submissionSource = "bitrix";
    payload.publishedAt = new Date();
    payload.bitrixSubmitted = true;

    const doc = await Evaluation.create(payload);

    res.status(201).json({
      success: true,
      message: "Evaluation saved successfully",
      data: doc,
    });
  } catch (err) {
    console.error("Webhook error:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

const createEvaluationsFromFrontend = AsyncHandler(async (req, res) => {
  try {
    const payload = {
      ...req.body,
      audio: req.file ? req.file.path : null,
    };

    console.log("Frontend Payload:", payload); // ✅ fixed variable name

    // Set as published for frontend submissions
    payload.status = "published";
    payload.submissionSource = "frontend";
    payload.publishedAt = new Date();
    payload.bitrixSubmitted = false;

    // Save to DB as published
    const doc = await Evaluation.create(payload);

    res.status(201).json({
      success: true,
      message: "Evaluation published successfully",
      data: doc,
    });
  } catch (err) {
    console.error("Frontend submission error:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

const publishEvaluations = AsyncHandler(async (req, res) => {
  try {
    const { id } = req.params;

    // Check if evaluation exists and isn't already published
    const existingEvaluation = await Evaluation.findById(id);

    if (!existingEvaluation) {
      return res.status(404).json({
        success: false,
        message: "Evaluation not found",
      });
    }

    if (existingEvaluation.status === "published") {
      const fresh = await Evaluation.findById(id)
        .populate("owner", "name email")
        .lean();
      return res.status(200).json({
        success: true,
        message: "Already published",
        data: fresh,
        userEmail: existingEvaluation.useremail,
      });
    }

    // Update evaluation status (no populate on non-existent "user" path — that caused runtime errors)
    const evaluation = await Evaluation.findByIdAndUpdate(
      id,
      {
        status: "published",
        publishedAt: new Date(),
      },
      { new: true, runValidators: true }
    ).populate("owner", "name email");

    const userEmail = evaluation.useremail;

    console.log("Published evaluation for user:", userEmail);

    res.status(200).json({
      success: true,
      message: "Evaluation published successfully",
      data: evaluation,
      userEmail: userEmail, // Include email in response if needed
    });
  } catch (err) {
    console.error("Publish error:", err.message);

    res.status(500).json({
      success: false,
      message: "Failed to publish evaluation",
    });
  }
});

// const publishEvaluations = AsyncHandler(async (req, res) => {
//   try {
//     const { id } = req.params;

//     const evaluation = await Evaluation.findByIdAndUpdate(
//       id,
//       {
//         status: 'published',
//         publishedAt: new Date()
//       },
//       { new: true }
//     );

//     if (!evaluation) {
//       return res.status(404).json({ success: false, message: "Evaluation not found" });
//     }

//     res.status(200).json({
//       success: true,
//       message: "Evaluation published successfully",
//       data: evaluation,
//     });
//   } catch (err) {
//     console.error("Publish error:", err.message);
//     res.status(500).json({ success: false, message: err.message });
//   }
// });

const createBulkEvaluations = async (req, res) => {
  try {
    const evaluations = req.body;

    if (!Array.isArray(evaluations)) {
      return res
        .status(400)
        .json({ message: "Input should be an array of evaluations" });
    }

    // Validate each evaluation
    const invalidEvaluations = evaluations.filter(
      (item) =>
        !item.owner ||
        !item.useremail ||
        !item.leadID ||
        !item.agentName ||
        !item.mod ||
        !item.teamleader
    );

    if (invalidEvaluations.length > 0) {
      return res.status(400).json({
        message: `${invalidEvaluations.length} evaluations missing required fields`,
        examples: invalidEvaluations.slice(0, 3),
      });
    }

    // Add all evaluations to the queue
    const jobs = evaluations.map((item) => ({
      data: item,
      opts: {
        attempts: 3,
        backoff: { type: "exponential", delay: 1000 },
        timeout: 30000,
      },
    }));

    await evaluationQueue.addBulk(jobs);

    res.status(202).json({
      message: `${evaluations.length} evaluations queued for processing`,
      queueStatus: {
        waiting: await evaluationQueue.getWaitingCount(),
        active: await evaluationQueue.getActiveCount(),
      },
    });
  } catch (error) {
    console.error("Error queuing bulk evaluations:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// List evaluations with filtering + pagination (caches first-page filtered results)
const getEvaluations = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 100, 1000); // Max 1000 per page
    const skip = (page - 1) * limit;

    // Build query from optional filters
    const query = {};
    if (req.query.agentName) query.agentName = req.query.agentName;
    if (req.query.teamleader) query.teamleader = req.query.teamleader;
    if (req.query.mod) query.mod = req.query.mod;
    if (req.query.startDate || req.query.endDate) {
      query.createdAt = {};
      if (req.query.startDate)
        query.createdAt.$gte = new Date(req.query.startDate);
      if (req.query.endDate) query.createdAt.$lte = new Date(req.query.endDate);
    }

    const [evaluations, total] = await Promise.all([
      Evaluation.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Evaluation.countDocuments(query),
    ]);

    // Cache the first page for common queries
    if (page === 1 && Object.keys(query).length > 0) {
      const cacheKey = `evals:${JSON.stringify(query)}`;
      redisClient.setex(cacheKey, 60, JSON.stringify(evaluations)); // Cache for 60 seconds
    }

    res.status(200).json({
      data: evaluations,
      meta: {
        total,
        page,
        pages: Math.ceil(total / limit),
        limit,
      },
    });
  } catch (error) {
    console.error("Error fetching evaluations:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Read single evaluation with Redis cache fallback to MongoDB
const getEvaluationById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid evaluation ID" });
    }

    const cacheKey = `eval:${id}`;

    try {
      // Try to get from Redis first (using promises)
      const cachedData = await redisClient.get(cacheKey);

      if (cachedData) {
        return res.status(200).json(JSON.parse(cachedData));
      }

      // Not in cache - query database
      const evaluation = await Evaluation.findById(id).lean();

      if (!evaluation) {
        return res.status(404).json({ message: "Evaluation not found" });
      }

      // Cache for 1 hour (using promises)
      await redisClient.setEx(cacheKey, 3600, JSON.stringify(evaluation));
      return res.status(200).json(evaluation);
    } catch (redisError) {
      console.error("Redis error:", redisError);
      // Fallback to DB if Redis fails
      const evaluation = await Evaluation.findById(id).lean();
      if (!evaluation) {
        return res.status(404).json({ message: "Evaluation not found" });
      }
      return res.status(200).json(evaluation);
    }
  } catch (error) {
    console.error("Error fetching evaluation:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Normalize edit-form payloads: criteria must be { value, points, comment } not plain strings.
const CRITERION_PATHS = [
  "greetings",
  "responsetime",
  "accuracy",
  "building",
  "presenting",
  "closing",
  "bonus",
];

const normalizeCriterionUpdate = (val) => {
  if (val == null) return undefined;
  if (typeof val === "object" && !Array.isArray(val) && val !== null) {
    return val;
  }
  if (typeof val === "string") {
    const s = val.trim();
    return { value: s || null, points: 0, comment: "" };
  }
  return val;
};

// Update mutable fields of an evaluation and refresh cache
const updateEvaluation = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid evaluation ID" });
    }

    // Prevent changing certain fields
    const protectedFields = [
      "owner",
      "useremail",
      "leadID",
      "createdAt",
      "status",
      "publishedAt",
    ];
    protectedFields.forEach((field) => delete updateData[field]);

    CRITERION_PATHS.forEach((key) => {
      if (Object.prototype.hasOwnProperty.call(updateData, key)) {
        const normalized = normalizeCriterionUpdate(updateData[key]);
        if (normalized !== undefined) updateData[key] = normalized;
      }
    });

    const evaluation = await Evaluation.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
      lean: true,
    });

    if (!evaluation) {
      return res.status(404).json({ message: "Evaluation not found" });
    }

    // Update cache using new Redis syntax
    const cacheKey = `eval:${id}`;
    await redisClient.set(cacheKey, JSON.stringify(evaluation), {
      EX: 3600, // Set expiration in seconds
    });

    res.status(200).json(evaluation);
  } catch (error) {
    console.error("Error updating evaluation:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Delete evaluation and evict cache
const deleteEvaluation = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid evaluation ID" });
    }

    const evaluation = await Evaluation.findByIdAndDelete(id).lean();

    if (!evaluation) {
      return res.status(404).json({ message: "Evaluation not found" });
    }

    // Clear cache
    const cacheKey = `eval:${id}`;
    redisClient.del(cacheKey);

    res.status(200).json({
      message: "Evaluation deleted successfully",
      deletedEvaluation: evaluation,
    });
  } catch (error) {
    console.error("Error deleting evaluation:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Health check for queue
// Queue health status endpoint
const getQueueStatus = async (req, res) => {
  try {
    const counts = await Promise.all([
      evaluationQueue.getWaitingCount(),
      evaluationQueue.getActiveCount(),
      evaluationQueue.getCompletedCount(),
      evaluationQueue.getFailedCount(),
    ]);

    // For Redis v4+, use isOpen instead of connected
    const redisStatus = redisClient.isOpen ? "connected" : "disconnected";

    res.status(200).json({
      status: "operational",
      queueStats: {
        waiting: counts[0],
        active: counts[1],
        completed: counts[2],
        failed: counts[3],
      },
      redisStatus,
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      error: error.message,
    });
  }
};

// Total count of evaluations
const totalevaluationcounts = AsyncHandler(async (req, res) => {
  const count = await Evaluation.countDocuments();
  res.status(200).json({ success: true, count });
});

// Filter evaluations by date range and optional agent/teamleader
const datefilterevaluation = async (req, res) => {
  try {
    const { startDate, endDate, agentName, teamleader } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: "Both startDate and endDate are required.",
      });
    }

    const formattedStartDate = new Date(startDate);
    const formattedEndDate = new Date(endDate);

    if (
      isNaN(formattedStartDate.getTime()) ||
      isNaN(formattedEndDate.getTime())
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid date format. Use YYYY-MM-DD.",
      });
    }

    const query = {
      createdAt: {
        $gte: new Date(formattedStartDate.setUTCHours(0, 0, 0, 0)),
        $lt: new Date(formattedEndDate.setUTCHours(23, 59, 59, 999)),
      },
    };

    if (teamleader && teamleader.trim() !== "") {
      query.teamleader = { $regex: new RegExp(teamleader, "i") };
    }

    if (agentName && agentName.trim() !== "") {
      query.agentName = { $regex: new RegExp(agentName, "i") };
    }

    const scopedQuery = req.user
      ? await mergeQueryWithQcScope(req.user, query)
      : query;

    const filteredData = await Evaluation.find(scopedQuery);

    if (!filteredData || filteredData.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No data found for the selected filters.",
      });
    }

    res.status(200).json({
      success: true,
      data: filteredData,
    });
  } catch (error) {
    console.error("Error in getCalendarFilterDataEvaluation:", error);
    res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
    });
  }
};

// export const getEvaluationsByOwner = async (req, res) => {
//   try {
//     const { ownerId } = req.params;

//     const evaluations = await Evaluation.find({ owner: ownerId });

//     res.status(200).json({
//       success: true,
//       ownerId,
//       total: evaluations.length,
//       data: evaluations,
//     });
//   } catch (err) {
//     res.status(500).json({ success: false, message: err.message });
//   }
// };

// List evaluations belonging to a specific owner id
const getEvaluationsByOwner = AsyncHandler(async (req, res) => {
  const { ownerId } = req.params;

  const evaluations = await Evaluation.find({ owner: ownerId });

  if (!evaluations || evaluations.length === 0) {
    return res
      .status(404)
      .json({ message: "No evaluations found for this owner" });
  }

  res.json({
    count: evaluations.length,
    evaluations,
  });
});

const getEvaluationsByAgentName = AsyncHandler(async (req, res) => {
  try {
    const { agentName } = req.params;

    // case-insensitive search
    const evaluation = await Evaluation.find({
      agentName: { $regex: new RegExp(`^${agentName}$`, "i") },
    }).sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: evaluation });
  } catch (error) {
    console.error("Error fetching evaluation by agentName:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

const getEvaluationsByUseremail = AsyncHandler(async (req, res) => {
  try {
    const { useremail } = req.params;

    const email = (useremail || "").toString().trim();
    const rx = new RegExp(`^${email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");

    // case-insensitive search across common email fields (legacy + current)
    const evaluation = await Evaluation.find({
      $or: [
        { useremail: { $regex: rx } },
        { userEmail: { $regex: rx } },
        { email: { $regex: rx } },
        { evaluatedby: { $regex: rx } },
        { evaluatedBy: { $regex: rx } },
      ],
    }).sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: evaluation });
  } catch (error) {
    console.error("Error fetching evaluation by useremail:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

const dailyEvaluationFormSubmit = async (req, res) => {
  try {
    const data = await Evaluation.aggregate([
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.json(data.map((item) => ({ date: item._id, count: item.count })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getEvaluationsPublishedByUseremail = async (req, res) => {
  try {
    const { useremail } = req.params;

    const email = (useremail || "").toString().trim();
    const rx = new RegExp(`^${email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");

    const evaluations = await Evaluation.find({
      $and: [
        {
          $or: [
            { useremail: { $regex: rx } },
            { userEmail: { $regex: rx } },
            { email: { $regex: rx } },
            { evaluatedby: { $regex: rx } },
            { evaluatedBy: { $regex: rx } },
          ],
        },
        { $or: [{ status: "published" }, { submissionSource: "frontend" }] },
      ],
    }).sort({ publishedAt: -1, createdAt: -1 });

    res.status(200).json({
      success: true,
      data: evaluations,
      count: evaluations.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getEvaluationsDraftsByUseremail = async (req, res) => {
  try {
    const { useremail } = req.params;

    const email = (useremail || "").toString().trim();
    const rx = new RegExp(`^${email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");

    const evaluations = await Evaluation.find({
      $and: [
        {
          $or: [
            { useremail: { $regex: rx } },
            { userEmail: { $regex: rx } },
            { email: { $regex: rx } },
            { evaluatedby: { $regex: rx } },
            { evaluatedBy: { $regex: rx } },
          ],
        },
        { $or: [{ status: "draft" }, { submissionSource: "bitrix" }] },
      ],
    }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: evaluations,
      count: evaluations.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export {
  createEvaluations,
  createEvaluationsFromFrontend,
  publishEvaluations,
  createBulkEvaluations,
  getEvaluations,
  getEvaluationById,
  updateEvaluation,
  deleteEvaluation,
  getQueueStatus,
  totalevaluationcounts,
  evaluationQueue,
  datefilterevaluation,
  getEvaluationsByOwner,
  getEvaluationsByAgentName,
  dailyEvaluationFormSubmit,
  getEvaluationsByUseremail,
  getEvaluationsPublishedByUseremail,
  getEvaluationsDraftsByUseremail,
};
