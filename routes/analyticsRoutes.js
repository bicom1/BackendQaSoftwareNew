// backend/routes/analyticsRoutes.js
const express = require('express');
const authMiddleware = require("../middlewares/authMiddleware");
const {
  getOverviewAnalytics,
  getEvaluationAnalytics,
  getEscalationAnalytics,
  getMarketingAnalytics,
  agentFormSubmits,
  getContentOverview,
  getWeeklyStats,
} = require("../controllers/analyticsController");
const { getQcModuleDashboard, getQcModuleForms } = require("../controllers/qcAnalyticsController");
const router = express.Router();


router.get('/overview', getOverviewAnalytics);
router.get("/content-overview", getContentOverview);
router.get('/getEvaluationAnalytics', getEvaluationAnalytics);
router.get('/getEscalationAnalytics', getEscalationAnalytics);
router.get('/getMarketingAnalytics', getMarketingAnalytics);
router.get('/agent-form-submits', agentFormSubmits);
router.get('/weekly-stats', getWeeklyStats);
router.get('/qc-module-dashboard', authMiddleware, getQcModuleDashboard);
router.get('/qc-module-forms', authMiddleware, getQcModuleForms);

module.exports = router;
