const express = require('express');
const router = express.Router();
const { callBitrixApi, crmleadlist, getAllLeads, getFilteredLeads } = require('../controllers/bitrix24Controller');




router.post('/call-b24-api',callBitrixApi);
router.get('/crmleadlist', crmleadlist)
router.get('/leads', getAllLeads);
router.post('/getFilteredLeads', getFilteredLeads)

router.get('/test', (req, res) => {
    res.send('Bitrix24 route is working!');
  });

module.exports = router;