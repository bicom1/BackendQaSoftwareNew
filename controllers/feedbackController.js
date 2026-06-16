const Feedback = require("../models/Feedback");
const Evaluation = require("../models/Evaluation");
const Escalation = require("../models/Escalation");

const agentOwnsForm = (user, form, formType) => {
  const email = (user.email || "").trim().toLowerCase();
  const name = (user.name || "").trim().toLowerCase();
  const formEmail = (form.useremail || "").trim().toLowerCase();
  const formAgent = (form.agentName || "").trim().toLowerCase();
  return formEmail === email || formAgent === name;
};

exports.getMyAppeals = async (req, res) => {
  try {
    const appeals = await Feedback.find({ submitterId: req.user._id }).sort({
      createdAt: -1,
    });
    res.status(200).json({ success: true, count: appeals.length, data: appeals });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

exports.getAllFeedback = async (req, res) => {
  try {
    const feedback = await Feedback.find().sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      count: feedback.length,
      data: feedback,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

exports.createAppeal = async (req, res) => {
  try {
    const { formType, formId, leadID, agentName, appealMessage } = req.body;

    if (!formType || !formId || !appealMessage?.trim()) {
      return res.status(400).json({
        success: false,
        message: "formType, formId, and appealMessage are required",
      });
    }

    if (!["evaluation", "escalation"].includes(formType)) {
      return res.status(400).json({
        success: false,
        message: "formType must be evaluation or escalation",
      });
    }

    if (appealMessage.trim().length < 20) {
      return res.status(400).json({
        success: false,
        message: "Appeal message must be at least 20 characters",
      });
    }

    let form;
    if (formType === "evaluation") {
      form = await Evaluation.findById(formId);
    } else {
      form = await Escalation.findById(formId);
    }

    if (!form) {
      return res.status(404).json({
        success: false,
        message: "Submitted form not found",
      });
    }

    if (!agentOwnsForm(req.user, form, formType)) {
      return res.status(403).json({
        success: false,
        message: "You can only appeal your own submitted forms",
      });
    }

    const attachments = (req.files || []).map((file) => ({
      filename: file.filename,
      originalName: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      path: `/uploads/appeals/${file.filename}`,
    }));

    const appeal = await Feedback.create({
      submitterId: req.user._id,
      submitterName: req.user.name,
      submitterEmail: req.user.email,
      formType,
      formId,
      leadID: leadID || form.leadID?.toString() || "",
      agentName: agentName || form.agentName || req.user.name,
      appealMessage: appealMessage.trim(),
      attachments,
    });

    res.status(201).json({ success: true, data: appeal });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

exports.getFeedback = async (req, res) => {
  try {
    const feedback = await Feedback.findById(req.params.id);
    if (!feedback) {
      return res.status(404).json({
        success: false,
        message: "Feedback not found",
      });
    }
    res.status(200).json({ success: true, data: feedback });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

exports.updateFeedback = async (req, res) => {
  try {
    const { status } = req.body;
    let feedback = await Feedback.findById(req.params.id);
    if (!feedback) {
      return res.status(404).json({
        success: false,
        message: "Feedback not found",
      });
    }
    if (status) feedback.status = status;
    await feedback.save();
    res.status(200).json({ success: true, data: feedback });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

exports.deleteFeedback = async (req, res) => {
  try {
    const feedback = await Feedback.findById(req.params.id);
    if (!feedback) {
      return res.status(404).json({
        success: false,
        message: "Feedback not found",
      });
    }
    await Feedback.findByIdAndDelete(req.params.id);
    res.status(200).json({
      success: true,
      message: "Feedback deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};
