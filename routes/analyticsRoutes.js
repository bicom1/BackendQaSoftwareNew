// backend/routes/analyticsRoutes.js
const express = require('express');
const { getOverviewAnalytics, getEvaluationAnalytics, getEscalationAnalytics, getMarketingAnalytics } = require('../controllers/analyticsController');
const router = express.Router();


router.get('/overview', getOverviewAnalytics);
router.get('/getEvaluationAnalytics', getEvaluationAnalytics);
router.get('/getEscalationAnalytics', getEscalationAnalytics);
router.get('/getMarketingAnalytics', getMarketingAnalytics);


module.exports = router;
