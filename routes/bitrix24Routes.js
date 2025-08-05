const express = require('express');
const router = express.Router();
// const { crmleadlist, getAllLeads, getFilteredLeads } = require('../controllers/bitrix24Controller');
const { callBitrixApi } = require('../services/bitrixApi');

// Get all leads
router.get('/leads', async (req, res) => {
  try {
    const leads = await callBitrixApi('crm.lead.list');
    res.json(leads);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all contacts
router.get('/contacts', async (req, res) => {
  try {
    const contacts = await callBitrixApi('crm.contact.list');
    res.json(contacts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all deals
router.get('/deals', async (req, res) => {
  try {
    const deals = await callBitrixApi('crm.deal.list');
    res.json(deals);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get lead by ID
router.get('/leads/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const lead = await callBitrixApi('crm.lead.get', { id });
    res.json(lead);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// router.post('/call-b24-api',callBitrixApi);
// router.get('/crmleadlist', crmleadlist)
// router.get('/leads', getAllLeads);
// router.post('/getFilteredLeads', getFilteredLeads)

router.get('/test', (req, res) => {
    res.send('Bitrix24 route is working!');
  });

module.exports = router;



// http://localhost:3001/api/bitrix24/crmleadlist?filter={"STATUS_ID":"NEW"}
// http://localhost:3001/api/bitrix24/crmleadlist?filter={"STATUS_ID":"NEW","SOURCE_ID":"WEB"}
// http://localhost:3001/api/bitrix24/crmleadlist?filter={"STATUS_ID":"NEW"}&select=["ID","TITLE","STATUS_ID"]
// http://localhost:3001/api/bitrix24/crmleadlist?order={"DATE_CREATE":"DESC"}&select=["ID","TITLE","DATE_CREATE"]








