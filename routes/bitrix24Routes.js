const express = require('express');
const router = express.Router();
const {
  getLeads,
  getContacts,
  getDeals,
  getLeadById,
  testRoute,
  searchLeads,
  getLeadByNumber,
  bitrixLeadButton,
  handleWebhook,
} = require('../controllers/bitrix24Controller');
const Escalation = require('../models/Escalation');
const { getEscalationByIdBitrix, createEscalation, getAgentName } = require('../controllers/escalationController');

router.get('/leads', getLeads);
router.get('/contacts', getContacts);
router.get('/deals', getDeals);
router.get('/leads/:id', getLeadById);
router.get('/user-leads/:id', getLeadByNumber);
router.get('/search-leads', searchLeads); 
router.get('/test', testRoute);
router.post('/lead-button', bitrixLeadButton)
// router.post("/webhook", handleWebhook);
// router.get("/:id", getEscalationByIdBitrix); 
router.get("/:identifier", getEscalationByIdBitrix);
router.post('/webhook', createEscalation);
router.get('/:agentEmail', getAgentName)
// In your bitrix24Routes.js file




module.exports = router;



router.get('/test', (req, res) => {
    res.send('Bitrix24 route is working!');
  });

module.exports = router;



// http://localhost:3001/api/bitrix24/crmleadlist?filter={"STATUS_ID":"NEW"}
// http://localhost:3001/api/bitrix24/crmleadlist?filter={"STATUS_ID":"NEW","SOURCE_ID":"WEB"}
// http://localhost:3001/api/bitrix24/crmleadlist?filter={"STATUS_ID":"NEW"}&select=["ID","TITLE","STATUS_ID"]
// http://localhost:3001/api/bitrix24/crmleadlist?order={"DATE_CREATE":"DESC"}&select=["ID","TITLE","DATE_CREATE"]








