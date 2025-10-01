 const express = require('express');
const { createEvaluation,
    getEvaluations,
    getEvaluationById,
    updateEvaluation,
    deleteEvaluation,
    createBulkEvaluations,
    getQueueStatus,
    totalevaluationcounts,
    datefilterevaluation,
    getEvaluationsByOwner, 
    getEvaluationsByAgentName,
    dailyEvaluationFormSubmit,
    createEvaluations,
    createEvaluationsFromFrontend,
    publishEvaluations} = require('../controllers/evaluationController');
const Evaluation = require('../models/Evaluation');

const router = express.Router();


// router.post('/', createEvaluation);
router.post('/bulk', createBulkEvaluations);
router.get('/getevaluations', getEvaluations);
router.get('/getevaluationbyid/:id', getEvaluationById);
router.get('/queue/status', getQueueStatus);
router.put('/evaluations/:id', updateEvaluation);
router.delete('/evaluations/:id', deleteEvaluation); 
router.get("/totalevaluationcounts", totalevaluationcounts);
router.get('/datefilterevaluation',datefilterevaluation)
router.get("/owner/:ownerId", getEvaluationsByOwner);
router.get("/agent/:agentName",  getEvaluationsByAgentName);
router.get('/dailyevaluationformsubmit', dailyEvaluationFormSubmit)

// Bitrix webhook - creates draft
router.post('/webhook/evaluations', createEvaluations);

// Frontend form - publishes immediately
router.post('/evaluations/frontend', createEvaluationsFromFrontend);

// Publish existing draft
router.patch('/evaluations/:id/publish', publishEvaluations);

// Get evaluations by status
router.get('/evaluations/published', async (req, res) => {
  try {
    const evaluations = await Evaluation.find({ status: 'published' }).sort({ publishedAt: -1 });
    res.json({ success: true, data: evaluations });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/evaluations/drafts', async (req, res) => {
  try {
    const evaluations = await Evaluation.find({ status: 'draft' }).sort({ createdAt: -1 });
    res.json({ success: true, data: evaluations });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});




module.exports = router;