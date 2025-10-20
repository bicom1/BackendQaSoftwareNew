const { callBitrixApi } = require("../services/bitrixApi");
const Lead = require("../models/Lead");
const Contact = require("../models/Contact");
const Deal = require("../models/Deal");
const Escalation = require("../models/Escalation");
const Evaluation = require("../models/Evaluation");
const Marketing = require("../models/Marketing");

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
        ...rest, // extra optional fields
      });
      return res.json({
        success: true,
        message: "Escalation saved via webhook",
        data: savedData,
      });
    }

    if (type === "evaluation") {
      savedData = await Evaluation.create({
        leadID,
        agentName,
        leadSource,
        ...rest,
      });
      return res.json({
        success: true,
        message: "Evaluation saved via webhook",
        data: savedData,
      });
    }

    if (type === "marketing") {
      savedData = await Marketing.create({
        leadID,
        agentName,
        leadSource,
        ...rest,
      });
      return res.json({
        success: true,
        message: "Marketing saved via webhook",
        data: savedData,
      });
    }

    return res.status(400).json({
      success: false,
      message: "Invalid type. Use escalation, evaluation, or marketing",
    });
  } catch (error) {
    console.error("Webhook Error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get and store leads
exports.getLeads = async (req, res) => {
  try {
    const leads = await callBitrixApi("crm.lead.list");
    console.log("Leads fetched:", leads?.result?.length);

    if (leads.result && Array.isArray(leads.result)) {
      await Promise.all(
        leads.result.map(async (item) => {
          const exists = await Lead.findOne({ "data.ID": item.ID });
          if (!exists) {
            await Lead.create({ data: item });
          }
        })
      );
    }

    res.json(leads);
  } catch (err) {
    console.error("Error in getLeads:", err.message);
    res.status(500).json({ error: err.message });
  }
};

// Get and store contacts
exports.getContacts = async (req, res) => {
  try {
    const contacts = await callBitrixApi("crm.contact.list");

    if (contacts.result && Array.isArray(contacts.result)) {
      await Promise.all(
        contacts.result.map(async (item) => {
          const exists = await Contact.findOne({ "data.ID": item.ID });
          if (!exists) {
            await Contact.create({ data: item });
          }
        })
      );
    }

    res.json(contacts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get and store deals
exports.getDeals = async (req, res) => {
  try {
    const deals = await callBitrixApi("crm.deal.list");

    if (deals.result && Array.isArray(deals.result)) {
      await Promise.all(
        deals.result.map(async (item) => {
          const exists = await Deal.findOne({ "data.ID": item.ID });
          if (!exists) {
            await Deal.create({ data: item });
          }
        })
      );
    }

    res.json(deals);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get lead by ID
exports.getLeadById = async (req, res) => {
  const { id } = req.params;

  try {
    const lead = await callBitrixApi("crm.lead.get", { id });
    res.json(lead);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.searchLeads = async (req, res) => {
  const query = req.query.q;

  if (!query) {
    return res.status(400).json({ error: "Search query (q) is required" });
  }

  try {
    // 1. Try MongoDB first
    const mongoResults = await Lead.find({
      "data.TITLE": { $regex: query, $options: "i" },
    });

    if (mongoResults.length > 0) {
      console.log("Returning leads from MongoDB");
      return res.json({ source: "mongodb", result: mongoResults });
    }

    // 2. Not found → fallback to Bitrix24
    console.log("Querying Bitrix24...");
    const bitrixResponse = await callBitrixApi("crm.lead.list", {
      filter: { TITLE: query },
    });

    const bitrixLeads = bitrixResponse?.result || [];

    // 3. Store results in MongoDB (if not already)
    await Promise.all(
      bitrixLeads.map(async (item) => {
        const exists = await Lead.findOne({ "data.ID": item.ID });
        if (!exists) {
          await Lead.create({ data: item });
        }
      })
    );

    res.json({ source: "bitrix24", result: bitrixLeads });
  } catch (err) {
    console.error("searchLeads error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

exports.getLeadByNumber = async (req, res) => {
  const leadId = req.params.id;

  if (!leadId) {
    return res.status(400).json({ error: "Lead ID is required" });
  }

  try {
    // 1. Check in MongoDB first
    const lead = await Lead.findOne({ "data.ID": leadId });

    if (lead) {
      console.log("Lead found in MongoDB");
      return res.json({ source: "mongodb", result: lead });
    }

    // 2. Not found → fetch from Bitrix24
    console.log("Fetching lead from Bitrix24...");
    const bitrixResponse = await callBitrixApi("crm.lead.get", { id: leadId });

    if (bitrixResponse?.result) {
      // Save to MongoDB
      await Lead.create({ data: bitrixResponse.result });

      return res.json({ source: "bitrix24", result: bitrixResponse.result });
    } else {
      return res.status(404).json({ error: "Lead not found in Bitrix24" });
    }
  } catch (err) {
    console.error("getLeadByNumber error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

exports.bitrixLeadButton = async (req, res) => {
  try {
    const { leadId } = req.body;

    if (!leadId) {
      return res
        .status(400)
        .json({ success: false, message: "leadId is required" });
    }

    const leadData = await callBitrixApi("crm.lead.get", { ID: leadId });

    return res.json({
      success: true,
      lead: leadData.result,
    });
  } catch (error) {
    console.error("Error in bitrixLeadButton:", error.message);
    return res.status(500).json({
      success: false,
      message: "Something went wrong while fetching lead details",
    });
  }
};

// Test route
exports.testRoute = (req, res) => {
  res.send("Bitrix24 route is working!");
};
