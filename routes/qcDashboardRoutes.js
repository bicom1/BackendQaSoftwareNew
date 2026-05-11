// routes/qcDashboardRoutes.js
const express = require("express");
const router = express.Router();
const {
  getQcDashboard,
  getTopPerformers,
  createEvaluation,
  getEvaluationHistory,
} = require("../controllers/qcDashboardController");

router.get("/qc-dashboard", getQcDashboard);

router.get("/qc-top-performers", getTopPerformers);

router.post("/qc-evaluation", createEvaluation);

router.get("/qc-evaluation-history", getEvaluationHistory);

module.exports = router;
