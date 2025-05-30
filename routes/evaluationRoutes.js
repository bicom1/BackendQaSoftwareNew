const express = require('express');
const { createEvaluation, getEvaluations, getEvaluationById, updateEvaluation, deleteEvaluation, createBulkEvaluations, getQueueStatus } = require('../controllers/evaluationController');

const router = express.Router();


router.post('/', createEvaluation);
router.post('/bulk', createBulkEvaluations);
router.get('/getevaluations', getEvaluations);
router.get('/getevaluationbyid/:id', getEvaluationById);
router.get('/queue/status', getQueueStatus);
router.put('/evaluations/:id', updateEvaluation);
router.delete('/evaluations/:id', deleteEvaluation); 

module.exports = router;