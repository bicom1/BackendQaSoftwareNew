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


// http://localhost:3001/api/bitrix24/crmleadlist?filter={"STATUS_ID":"NEW"}
// http://localhost:3001/api/bitrix24/crmleadlist?filter={"STATUS_ID":"NEW"}
// http://localhost:3001/api/bitrix24/crmleadlist?filter={"STATUS_ID":"NEW","SOURCE_ID":"WEB"}
// http://localhost:3001/api/bitrix24/crmleadlist?filter={"STATUS_ID":"NEW"}&select=["ID","TITLE","STATUS_ID"]
// http://localhost:3001/api/bitrix24/crmleadlist?order={"DATE_CREATE":"DESC"}&select=["ID","TITLE","DATE_CREATE"]

