const express = require('express');
const { createEscalation, createBulkEscalation, getEscalation, getEscalationById, getQueueStatus, updateEscalation, deleteEscalation } = require('../controllers/escalationController');



const router = express.Router();


router.post('/', createEscalation);
router.post('/bulk', createBulkEscalation);
router.get('/getescalations', getEscalation);
router.get('/getescalationbyid/:id', getEscalationById);
router.get('/queue/status', getQueueStatus);
// router.put('/escalations/:id', updateEscalation);
// router.delete('/escalations/:id', deleteEscalation); 

module.exports = router;