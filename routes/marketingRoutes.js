const express = require('express');
const router = express.Router();
const { createMarketing, createBulkMarketing, getMarketing, getMarketingById, getQueueStatus, updateMarketing, deleteMarketing, totalmarketingcounts } = require('../controllers/marketingController');
const authMiddleware = require('../middlewares/authMiddleware');

router.post('/',authMiddleware, createMarketing);
router.post('/bulk', authMiddleware, createBulkMarketing);
router.get('/getmarketing', authMiddleware, getMarketing);
router.get('/queue/status', authMiddleware, getQueueStatus);
router.get('/getmarketingbyid/:id' , authMiddleware, getMarketingById);
router.put('/marketing/:id', authMiddleware, updateMarketing);
router.delete('/marketing/:id', authMiddleware , deleteMarketing); 
router.get("/totalmarketingcounts", totalmarketingcounts);

module.exports = router;
