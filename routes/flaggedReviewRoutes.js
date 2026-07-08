const express = require("express");
const authMiddleware = require("../middlewares/authMiddleware");
const {
  listFlaggedReviews,
  forwardToQcAdmin,
  resolveFlaggedReview,
} = require("../controllers/flaggedReviewController");

const router = express.Router();

router.get("/", authMiddleware, listFlaggedReviews);
router.post("/:id/forward", authMiddleware, forwardToQcAdmin);
router.patch("/:id/decision", authMiddleware, resolveFlaggedReview);

module.exports = router;
