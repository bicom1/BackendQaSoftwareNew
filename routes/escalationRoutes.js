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
  dateFilterescalation
} = require('../controllers/escalationController');
const multer = require('multer');
const path = require('path');
const escalationQueue = require('../queues/escalationQueue'); 

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // Ensure this folder exists
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  },
});
const upload = multer({ storage });

// === Audio-based escalation upload route (now handles all form submissions) ===
router.post('/upload', upload.single('audio'), async (req, res) => {
  try {
    const data = {
      ...req.body, // req.body is correctly populated by Multer here
      audio: req.file ? `/uploads/${req.file.filename}` : null,
    };

    // Handle 'Other' action if specified by the frontend
    if (data.escAction === "Other" && req.body.otherReason) {
      data.escAction = req.body.otherReason; // Overwrite escAction with the custom reason
    }

    const job = await escalationQueue.add(data, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
    });

    res.status(202).json({
      message: 'Escalation queued with audio (or no audio)',
      jobId: job.id,
      queueStatus: {
        waiting: await escalationQueue.getWaitingCount()
      }
    });
  } catch (err) {
    console.error('[Audio Upload Error]', err);
    res.status(500).json({ error: err.message });
  }
});


router.post('/bulk', createBulkEscalation);
router.get('/getescalations', getEscalation);
router.get('/getescalationbyid/:id', getEscalationById);
router.get('/queue/status', getQueueStatus);
router.put('/:id', updateEscalation);
router.delete('/:id', deleteEscalation);
router.get('/getescalationsbyfilter', getescalationsbyfilter);
router.get("/totalescalationcounts", totalescalationcounts);
router.get("/dateFilterescalation", dateFilterescalation)




module.exports = router;