const express = require('express');
const router = express.Router();
const {
  getLeads,
  getContacts,
  getDeals,
  // getLeadById,
  testRoute,
  searchLeads,
  getLeadByNumber,
} = require('../controllers/bitrix24Controller');

router.get('/leads', getLeads);
router.get('/contacts', getContacts);
router.get('/deals', getDeals);
// router.get('/leads/:id', getLeadById);
router.get('/leads/:id', getLeadByNumber);
router.get('/search-leads', searchLeads); 
router.get('/test', testRoute);

module.exports = router;




router.get('/test', (req, res) => {
    res.send('Bitrix24 route is working!');
  });

module.exports = router;



// http://localhost:3001/api/bitrix24/crmleadlist?filter={"STATUS_ID":"NEW"}
// http://localhost:3001/api/bitrix24/crmleadlist?filter={"STATUS_ID":"NEW","SOURCE_ID":"WEB"}
// http://localhost:3001/api/bitrix24/crmleadlist?filter={"STATUS_ID":"NEW"}&select=["ID","TITLE","STATUS_ID"]
// http://localhost:3001/api/bitrix24/crmleadlist?order={"DATE_CREATE":"DESC"}&select=["ID","TITLE","DATE_CREATE"]








