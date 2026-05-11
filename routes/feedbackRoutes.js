const express = require("express");
const router = express.Router();
const {
  getAllFeedback,
  createFeedback,
  getFeedback,
  updateFeedback,
  deleteFeedback,
} = require("../controllers/feedbackController");
const authMiddleware = require("../middlewares/authMiddleware");

router.post("/", authMiddleware, createFeedback);
router.get("/", authMiddleware, getAllFeedback);
router.get("/:id", authMiddleware, getFeedback);
router.put("/:id", authMiddleware, updateFeedback);
router.delete("/:id", authMiddleware, deleteFeedback);

module.exports = router;
