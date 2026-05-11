const { callBitrixApi } = require("../services/bitrixApi");
const Lead = require("../models/Lead");
const Contact = require("../models/Contact");
const Deal = require("../models/Deal");
const Escalation = require("../models/Escalation");
const Evaluation = require("../models/Evaluation");
const Marketing = require("../models/Marketing");

// ===================== Webhook for Escalation/Evaluation/Marketing =====================
exports.handleWebhook = async (req, res) => {
  try {
    const { type, leadID, agentName, leadSource, ...rest } = req.body;

    if (!type || !leadID) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: type, leadID",
      });
    }

    let savedData;

    if (type === "escalation") {
      savedData = await Escalation.create({
        leadID,
        agentName,
        leadSource,
        ...rest,
      });
    } else if (type === "evaluation") {
      savedData = await Evaluation.create({
        leadID,
        agentName,
        leadSource,
        ...rest,
      });
    } else if (type === "marketing") {
      savedData = await Marketing.create({
        leadID,
        agentName,
        leadSource,
        ...rest,
      });
    } else {
      return res.status(400).json({
        success: false,
        message: "Invalid type. Use escalation, evaluation, or marketing",
      });
    }

    res.json({
      success: true,
      message: `${
        type.charAt(0).toUpperCase() + type.slice(1)
      } saved via webhook`,
      data: savedData,
    });
  } catch (error) {
    console.error("Webhook Error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ===================== GET all Leads from MongoDB =====================
exports.getLeads = async (req, res) => {
  try {
    const leads = await Lead.find();
    res.json({ success: true, data: leads });
  } catch (err) {
    console.error("Error fetching leads:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ===================== GET all Contacts from MongoDB =====================
exports.getContacts = async (req, res) => {
  try {
    const contacts = await Contact.find();
    res.json({ success: true, data: contacts });
  } catch (err) {
    console.error("Error fetching contacts:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ===================== GET all Deals from MongoDB =====================
exports.getDeals = async (req, res) => {
  try {
    const deals = await Deal.find();
    res.json({ success: true, data: deals });
  } catch (err) {
    console.error("Error fetching deals:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ===================== GET a single Lead by ID =====================
exports.getLeadById = async (req, res) => {
  const { id } = req.params;

  try {
    const lead = await Lead.findOne({ "data.ID": id });
    if (lead) return res.json({ success: true, source: "mongodb", data: lead });

    // fallback to Bitrix if not in MongoDB
    const bitrixResponse = await callBitrixApi("crm.lead.get", { id });
    if (!bitrixResponse.result) {
      return res
        .status(404)
        .json({ success: false, message: "Lead not found" });
    }

    const saved = await Lead.create({ data: bitrixResponse.result });
    res.json({ success: true, source: "bitrix24", data: saved });
  } catch (err) {
    console.error("Error fetching lead by ID:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ===================== Search Leads by TITLE =====================
exports.searchLeads = async (req, res) => {
  const query = req.query.q;
  if (!query)
    return res.status(400).json({ error: "Search query (q) is required" });

  try {
    const mongoResults = await Lead.find({
      "data.TITLE": { $regex: query, $options: "i" },
    });
    if (mongoResults.length > 0)
      return res.json({ source: "mongodb", result: mongoResults });

    const bitrixResponse = await callBitrixApi("crm.lead.list", {
      filter: { TITLE: query },
    });
    const bitrixLeads = bitrixResponse?.result || [];

    await Promise.all(
      bitrixLeads.map(async (item) => {
        const exists = await Lead.findOne({ "data.ID": item.ID });
        if (!exists) await Lead.create({ data: item });
      })
    );

    res.json({ source: "bitrix24", result: bitrixLeads });
  } catch (err) {
    console.error("searchLeads error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

// ===================== GET Lead by Number =====================
exports.getLeadByNumber = async (req, res) => {
  const leadId = req.params.id;
  if (!leadId) return res.status(400).json({ error: "Lead ID is required" });

  try {
    const lead = await Lead.findOne({ "data.ID": leadId });
    if (lead) return res.json({ source: "mongodb", result: lead });

    const bitrixResponse = await callBitrixApi("crm.lead.get", { id: leadId });
    if (!bitrixResponse?.result)
      return res.status(404).json({ error: "Lead not found" });

    const saved = await Lead.create({ data: bitrixResponse.result });
    res.json({ source: "bitrix24", result: saved });
  } catch (err) {
    console.error("getLeadByNumber error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

// ===================== Bitrix Lead Button =====================
exports.bitrixLeadButton = async (req, res) => {
  try {
    const { leadId } = req.body;
    if (!leadId)
      return res
        .status(400)
        .json({ success: false, message: "leadId is required" });

    const leadData = await callBitrixApi("crm.lead.get", { ID: leadId });
    res.json({ success: true, lead: leadData.result });
  } catch (error) {
    console.error("Error in bitrixLeadButton:", error.message);
    res.status(500).json({
      success: false,
      message: "Something went wrong while fetching lead details",
    });
  }
};

// ===================== Test Route =====================
exports.testRoute = (req, res) => {
  res.send("Bitrix24 route is working!");
};
