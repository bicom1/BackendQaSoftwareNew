const express = require("express");
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
} = require("../controllers/bitrix24Controller");

const {
  getEscalationByIdBitrix,
  getAgentName,
} = require("../controllers/escalationController");

// Bitrix24 API routes
router.get("/leads", getLeads);
router.get("/contacts", getContacts);
router.get("/deals", getDeals);
router.get("/leads/:id", getLeadById);
router.get("/user-leads/:id", getLeadByNumber);
router.get("/search-leads", searchLeads);
router.get("/test", testRoute);

router.post("/lead-button", bitrixLeadButton);
router.post("/webhook", handleWebhook);

router.get("/:identifier", getEscalationByIdBitrix);
router.get("/:agentEmail", getAgentName);

router.get("/test", (req, res) => {
  res.send("Bitrix24 route is working!");
});

module.exports = router;
