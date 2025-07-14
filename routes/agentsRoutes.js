const express = require('express');
const router = express.Router();





router.post('/call-b24-api',callBitrixApi);
router.get('/crmleadlist', crmleadlist)
router.get('/leads', getAllLeads);
router.post('/getFilteredLeads', getFilteredLeads)


module.exports = router;












