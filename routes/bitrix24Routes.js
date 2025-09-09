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

router.get('/leads', getLeads);
router.get('/contacts', getContacts);
router.get('/deals', getDeals);
router.get('/leads/:id', getLeadById);
router.get('/user-leads/:id', getLeadByNumber);
router.get('/search-leads', searchLeads); 
router.get('/test', testRoute);
router.post('/lead-button', bitrixLeadButton)
router.post("/webhook", handleWebhook);



router.post('/webhook', async (req, res) => {
  try {
    const { leadID, agentName, leadsource, type } = req.body;

    if (!leadID) {
      return res.status(400).json({ success: false, message: "leadID is required" });
    }

    // TODO: Save into MongoDB (Escalation/Marketing/Evaluation model depending on "type")
    console.log("📥 Incoming Bitrix data:", { leadID, agentName, leadsource, type });

    res.json({ success: true, message: "Data received" });
  } catch (error) {
    console.error("Bitrix Webhook Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});



router.get('/test', (req, res) => {
    res.send('Bitrix24 route is working!');
  });

module.exports = router;



// http://localhost:3001/api/bitrix24/crmleadlist?filter={"STATUS_ID":"NEW"}
// http://localhost:3001/api/bitrix24/crmleadlist?filter={"STATUS_ID":"NEW","SOURCE_ID":"WEB"}
// http://localhost:3001/api/bitrix24/crmleadlist?filter={"STATUS_ID":"NEW"}&select=["ID","TITLE","STATUS_ID"]
// http://localhost:3001/api/bitrix24/crmleadlist?order={"DATE_CREATE":"DESC"}&select=["ID","TITLE","DATE_CREATE"]








