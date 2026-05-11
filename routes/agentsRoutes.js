const express = require("express");
const {
  getLowRatingCalls,
  getLowRatingChats,
  getAgentDashboard,
  getAgentTrends,
} = require("../controllers/agentController");

const router = express.Router();

// Existing routes
router.get("/low-rating", getLowRatingCalls);
router.get("/low-rating-chats", getLowRatingChats);

// New dashboard routes
router.get("/dashboard/:agentName", getAgentDashboard);
router.get("/trends/:agentName", getAgentTrends);

module.exports = router;
