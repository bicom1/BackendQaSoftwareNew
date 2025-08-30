// routes/escalationRoutes.js
const express = require('express');
const {
  createBulkEscalation,
  getEscalation,
  getEscalationById,
  getQueueStatus,
  updateEscalation,
  deleteEscalation,
  getescalationsbyfilter,
  totalescalationcounts,
  dateFilterescalation,
  createEscalation
} = require('../controllers/escalationController');
const multer = require('multer');
const path = require('path');
const Escalation = require('../models/Escalation');

const router = express.Router();

// === Multer config for file uploads ===
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // Ensure this folder exists
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  },
});
const upload = multer({ storage });

// === Audio-based escalation upload route (now saves directly, no queue) ===
router.post('/upload', upload.single('audio'), async (req, res) => {
  try {
    const data = {
      ...req.body,
      audio: req.file ? `/uploads/${req.file.filename}` : null,
    };

    // Handle "Other" action if provided
    if (data.escAction === "Other" && req.body.otherReason) {
      data.escAction = req.body.otherReason;
    }

    // Save directly to DB
    const escalation = await Escalation.create(data);

    res.status(201).json({
      message: 'Escalation saved with audio (or no audio)',
      escalation,
    });
  } catch (err) {
    console.error('[Audio Upload Error]', err);
    res.status(500).json({ error: err.message });
  }
});

// === Escalation routes ===
router.post('/', createEscalation);
router.post('/bulk', createBulkEscalation);
router.get('/getescalations', getEscalation);
router.get('/getescalationbyid/:id', getEscalationById);
router.get('/queue/status', getQueueStatus); // will just return "Queue functionality removed"
router.put('/:id', updateEscalation);
router.delete('/:id', deleteEscalation);
router.get('/getescalationsbyfilter', getescalationsbyfilter);
router.get("/totalescalationcounts", totalescalationcounts);
router.get("/dateFilterescalation", dateFilterescalation);

module.exports = router;
