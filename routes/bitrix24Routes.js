const express = require('express');
const { createLead } = require('../controllers/bitrix24Controller');
const router = express.Router();

router.post('/leads', authMiddleware, createLead);


module.exports = router;