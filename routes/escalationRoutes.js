const express = require("express");
const multer = require("multer");
const {
  createEscalation,
  getEscalations,
  getEscalationById,
  updateEscalation,
  deleteEscalation,
  totalescalationscounts,
  datefilterescalation,
  getEscalationsByOwner,
  getEscalationsByAgentName,
  escalationPatch
} = require("../controllers/escalationController");

const router = express.Router();

// Ensure uploads/audio exists or create it at app startup
const path = require("path");
const fs = require("fs");
const authMiddleware = require("../middlewares/authMiddleware");
const uploadDir = path.join(process.cwd(), "uploads", "audio");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// Multer storage config for audio
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + "-" + file.originalname);
  },
});
const upload = multer({ storage });

// CRUD routes - PUT STATIC ROUTES FIRST
router.get("/totalescalationscounts", totalescalationscounts);
router.get('/datefiltereescalation', datefilterescalation);
router.post("/", upload.single("audio"), createEscalation);
router.get("/owner/:ownerId", getEscalationsByOwner);
router.get("/agent/:agentName", getEscalationsByAgentName);
router.get("/", getEscalations);
router.get("/:id", getEscalationById);


router.put("/:id", upload.single("audio"), updateEscalation);
router.patch('/escalation-patch/:id', authMiddleware, escalationPatch);      


router.delete("/:id", deleteEscalation);




module.exports = router;