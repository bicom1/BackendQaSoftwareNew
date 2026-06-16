const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const {
  getAllFeedback,
  getMyAppeals,
  createAppeal,
  getFeedback,
  updateFeedback,
  deleteFeedback,
} = require("../controllers/feedbackController");
const authMiddleware = require("../middlewares/authMiddleware");

const router = express.Router();

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_FILES = 5;

const uploadDir = path.join(process.cwd(), "uploads", "appeals");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".pdf", ".zip"];

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    cb(null, `${unique}-${safeName}`);
  },
});

const fileFilter = (_req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ALLOWED_EXTENSIONS.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error("Only images, PDF, and ZIP files are allowed (max 5MB each)"));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE, files: MAX_FILES },
});

router.get("/my", authMiddleware, getMyAppeals);
router.post(
  "/appeal",
  authMiddleware,
  (req, res, next) => {
    upload.array("attachments", MAX_FILES)(req, res, (err) => {
      if (err) {
        return res.status(400).json({
          success: false,
          message: err.message || "File upload failed",
        });
      }
      next();
    });
  },
  createAppeal
);
router.get("/", authMiddleware, getAllFeedback);
router.get("/:id", authMiddleware, getFeedback);
router.put("/:id", authMiddleware, updateFeedback);
router.delete("/:id", authMiddleware, deleteFeedback);

module.exports = router;
