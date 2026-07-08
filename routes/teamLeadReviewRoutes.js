const express = require("express");
const authMiddleware = require("../middlewares/authMiddleware");
const {
  listTeamLeadReviews,
  countTeamLeadReviews,
  getTeamLeadReview,
  askTeamLeadQuestion,
  answerTeamLeadQuestion,
  resolveTeamLeadReview,
} = require("../controllers/teamLeadReviewController");

const router = express.Router();

router.get("/", authMiddleware, listTeamLeadReviews);
router.get("/count", authMiddleware, countTeamLeadReviews);
router.get("/:evaluationId", authMiddleware, getTeamLeadReview);
router.post("/:evaluationId/questions", authMiddleware, askTeamLeadQuestion);
router.post(
  "/:evaluationId/threads/:threadId/answer",
  authMiddleware,
  answerTeamLeadQuestion
);
router.patch("/:evaluationId/resolve", authMiddleware, resolveTeamLeadReview);

module.exports = router;
