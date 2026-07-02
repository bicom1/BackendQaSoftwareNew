const express = require("express");
const authMiddleware = require("../middlewares/authMiddleware");
const {
  createEvaluation,
  getEvaluations,
  getEvaluationById,
  updateEvaluation,
  deleteEvaluation,
  createBulkEvaluations,
  getQueueStatus,
  totalevaluationcounts,
  datefilterevaluation,
  getEvaluationsByOwner,
  getEvaluationsByAgentName,
  dailyEvaluationFormSubmit,
  createEvaluations,
  createEvaluationsFromFrontend,
  publishEvaluations,
  getEvaluationsByUseremail,
  getEvaluationsPublishedByUseremail,
  getEvaluationsDraftsByUseremail,
} = require("../controllers/evaluationController");
const Evaluation = require("../models/Evaluation");

const router = express.Router();

// router.post('/', createEvaluation);
router.post("/bulk", createBulkEvaluations);
router.get("/getevaluations", getEvaluations);
router.get("/getevaluationbyid/:id", getEvaluationById);
router.get("/queue/status", getQueueStatus);
router.put("/:id", updateEvaluation);
router.delete("/:id", deleteEvaluation);
router.get("/totalevaluationcounts", totalevaluationcounts);
router.get("/datefilterevaluation", authMiddleware, datefilterevaluation);
router.get("/owner/:ownerId", getEvaluationsByOwner);
router.get("/agent/:agentName", getEvaluationsByAgentName);
router.get("/useremail/:useremail", getEvaluationsByUseremail);

router.get(
  "/useremail/:useremail/published",
  getEvaluationsPublishedByUseremail
);

router.get("/dailyevaluationformsubmit", dailyEvaluationFormSubmit);
router.get("/dailyEvaluationFormSubmit", dailyEvaluationFormSubmit);

// Bitrix webhook - creates draft
router.post("/webhook/evaluations", createEvaluations);

// Frontend form - publishes immediately
router.post("/frontend", createEvaluationsFromFrontend);

router.get("/evaluations/published", async (req, res) => {
  try {
    const evaluations = await Evaluation.find({ status: "published" }).sort({
      publishedAt: -1,
    });
    res.json({ success: true, data: evaluations });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
