// backend/routes/analyticsRoutes.js
const express = require('express');
const { getOverviewAnalytics, getEvaluationAnalytics, getEscalationAnalytics, getMarketingAnalytics, agentFormSubmits } = require('../controllers/analyticsController');
const router = express.Router();


router.get('/overview', getOverviewAnalytics);
router.get('/getEvaluationAnalytics', getEvaluationAnalytics);
router.get('/getEscalationAnalytics', getEscalationAnalytics);
router.get('/getMarketingAnalytics', getMarketingAnalytics);
router.get('/agent-form-submits', agentFormSubmits);


module.exports = router;
