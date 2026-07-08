const Evaluation = require("../models/Evaluation");
const Escalation = require("../models/Escalation");
const {
  normalizeRole,
  isSuperAdmin,
  isQcAdmin,
  isAgentAdmin,
  ROLES,
} = require("../helpers/roles");
const { resolveSubmitterName } = require("../helpers/qcScope");
const {
  ensureFlaggedReviewOnDoc,
  isFlaggedForm,
  purgeExpiredFlaggedReviews,
  getFlaggedRetentionCutoff,
} = require("../helpers/flaggedReview");

const flaggedBaseQuery = {
  $or: [
    { "flaggedReview.required": true },
    { "teamLeadReview.required": true },
  ],
};

const formatRow = (doc, formType) => {
  const row = doc.toObject ? doc.toObject() : { ...doc };
  ensureFlaggedReviewOnDoc(row, formType);
  return {
    ...row,
    formType,
    submitterName: resolveSubmitterName(row),
    flaggedReview: row.flaggedReview || { required: false },
  };
};

const findFlaggedSubmission = async (id) => {
  let doc = await Evaluation.findById(id);
  if (doc) return { doc, Model: Evaluation, formType: "evaluation" };
  doc = await Escalation.findById(id);
  if (doc) return { doc, Model: Escalation, formType: "escalation" };
  return null;
};

const mergeRows = (evalRows, escRows) => {
  const rows = [
    ...evalRows.map((r) => formatRow(r, "evaluation")),
    ...escRows.map((r) => formatRow(r, "escalation")),
  ];
  return rows.sort(
    (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
  );
};

const applyDateRange = (query, startDate, endDate, field = "createdAt") => {
  if (!startDate && !endDate) return query;
  const next = { ...query };
  const existing = next[field];
  const range =
    existing && typeof existing === "object" && !Array.isArray(existing)
      ? { ...existing }
      : {};
  if (startDate) {
    const start = new Date(`${startDate}T00:00:00.000Z`);
    range.$gte = range.$gte
      ? new Date(Math.max(new Date(range.$gte).getTime(), start.getTime()))
      : start;
  }
  if (endDate) {
    const end = new Date(`${endDate}T23:59:59.999Z`);
    range.$lte = range.$lte
      ? new Date(Math.min(new Date(range.$lte).getTime(), end.getTime()))
      : end;
  }
  next[field] = range;
  return next;
};

const fetchFlaggedRows = async (query, limit = 500) => {
  const [evalRows, escRows] = await Promise.all([
    Evaluation.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("owner", "name email")
      .lean(),
    Escalation.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("owner", "name email")
      .lean(),
  ]);
  return mergeRows(evalRows, escRows);
};

const listFlaggedReviews = async (req, res) => {
  try {
    await purgeExpiredFlaggedReviews();

    const actor = req.user;
    const role = normalizeRole(actor.role);
    const queue = (req.query.queue || "agent_admin").trim();
    const retentionCutoff = getFlaggedRetentionCutoff();
    const { startDate = "", endDate = "" } = req.query;
    const useResolvedDate =
      queue.includes("accepted") || queue.includes("rejected");
    const dateField = useResolvedDate ? "flaggedReview.qcResolvedAt" : "createdAt";

    if (queue === "agent_admin" || queue === "agent_admin_active") {
      if (!isAgentAdmin(role) && !isSuperAdmin(role)) {
        return res.status(403).json({
          success: false,
          message: "Only agent admin can view flagged chats",
        });
      }

      const query = applyDateRange(
        {
          ...flaggedBaseQuery,
          $or: [
            { "flaggedReview.status": { $in: ["pending", "forwarded_to_qc"] } },
            { "flaggedReview.status": { $exists: false } },
            { flaggedReview: { $exists: false } },
          ],
        },
        startDate,
        endDate,
        "createdAt"
      );

      const data = (await fetchFlaggedRows(query)).filter((row) => {
        const status = row.flaggedReview?.status || "pending";
        return status === "pending" || status === "forwarded_to_qc";
      });

      return res.json({ success: true, data });
    }

    if (queue === "agent_admin_accepted" || queue === "qc_admin_accepted") {
      const isAgent = queue.startsWith("agent_admin");
      if (isAgent && !isAgentAdmin(role) && !isSuperAdmin(role)) {
        return res.status(403).json({ success: false, message: "Forbidden" });
      }
      if (!isAgent && !isQcAdmin(role) && !isSuperAdmin(role)) {
        return res.status(403).json({ success: false, message: "Forbidden" });
      }

      const query = applyDateRange(
        {
          "flaggedReview.required": true,
          "flaggedReview.status": "approved",
          "flaggedReview.qcResolvedAt": { $gte: retentionCutoff },
        },
        startDate,
        endDate,
        dateField
      );
      return res.json({ success: true, data: await fetchFlaggedRows(query) });
    }

    if (queue === "agent_admin_rejected" || queue === "qc_admin_rejected") {
      const isAgent = queue.startsWith("agent_admin");
      if (isAgent && !isAgentAdmin(role) && !isSuperAdmin(role)) {
        return res.status(403).json({ success: false, message: "Forbidden" });
      }
      if (!isAgent && !isQcAdmin(role) && !isSuperAdmin(role)) {
        return res.status(403).json({ success: false, message: "Forbidden" });
      }

      const query = applyDateRange(
        {
          "flaggedReview.required": true,
          "flaggedReview.status": "rejected",
          "flaggedReview.qcResolvedAt": { $gte: retentionCutoff },
        },
        startDate,
        endDate,
        dateField
      );
      return res.json({ success: true, data: await fetchFlaggedRows(query) });
    }

    if (queue === "qc_admin" || queue === "qc_admin_pending") {
      if (!isQcAdmin(role) && !isSuperAdmin(role)) {
        return res.status(403).json({
          success: false,
          message: "Only QC admin can view forwarded flagged forms",
        });
      }

      const query = applyDateRange(
        {
          "flaggedReview.required": true,
          "flaggedReview.status": "forwarded_to_qc",
        },
        startDate,
        endDate,
        "createdAt"
      );
      return res.json({ success: true, data: await fetchFlaggedRows(query) });
    }

    return res.status(400).json({
      success: false,
      message: "Invalid queue parameter",
    });
  } catch (error) {
    console.error("listFlaggedReviews error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to load flagged reviews",
      error: error.message,
    });
  }
};

const forwardToQcAdmin = async (req, res) => {
  try {
    const actor = req.user;
    const role = normalizeRole(actor.role);

    if (!isAgentAdmin(role) && !isSuperAdmin(role)) {
      return res.status(403).json({
        success: false,
        message: "Only agent admin can forward to QC admin",
      });
    }

    const found = await findFlaggedSubmission(req.params.id);
    if (!found || !isFlaggedForm(found.doc)) {
      return res.status(404).json({
        success: false,
        message: "Flagged form not found",
      });
    }

    const { doc, formType } = found;
    ensureFlaggedReviewOnDoc(doc, formType);

    if (
      doc.flaggedReview.status === "approved" ||
      doc.flaggedReview.status === "rejected"
    ) {
      return res.status(400).json({
        success: false,
        message: "This form has already been closed by QC admin",
      });
    }

    doc.flaggedReview.required = true;
    doc.flaggedReview.status = "forwarded_to_qc";
    doc.flaggedReview.forwardedAt = new Date();
    doc.flaggedReview.forwardedByName = actor.name || "";
    doc.flaggedReview.forwardedByEmail = (actor.email || "").trim().toLowerCase();

    await doc.save();

    res.json({
      success: true,
      message: "Form forwarded to QC admin",
      data: formatRow(doc, formType),
    });
  } catch (error) {
    console.error("forwardToQcAdmin error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to forward form",
      error: error.message,
    });
  }
};

const resolveFlaggedReview = async (req, res) => {
  try {
    const actor = req.user;
    const role = normalizeRole(actor.role);
    const { decision, note } = req.body || {};

    if (!isQcAdmin(role) && !isSuperAdmin(role)) {
      return res.status(403).json({
        success: false,
        message: "Only QC admin can resolve flagged forms",
      });
    }

    if (!["approved", "rejected"].includes(decision)) {
      return res.status(400).json({
        success: false,
        message: 'Decision must be "approved" or "rejected"',
      });
    }

    const found = await findFlaggedSubmission(req.params.id);
    if (!found || !isFlaggedForm(found.doc)) {
      return res.status(404).json({
        success: false,
        message: "Flagged form not found",
      });
    }

    const { doc, formType } = found;
    ensureFlaggedReviewOnDoc(doc, formType);

    if (
      doc.flaggedReview.status !== "forwarded_to_qc" &&
      role !== ROLES.SUPER_ADMIN
    ) {
      return res.status(400).json({
        success: false,
        message: "Form must be forwarded by agent admin before QC can resolve",
      });
    }

    doc.flaggedReview.required = true;
    doc.flaggedReview.status = decision;
    doc.flaggedReview.qcNote = (note || "").trim().slice(0, 2000);
    doc.flaggedReview.qcResolvedAt = new Date();
    doc.flaggedReview.qcResolvedByName = actor.name || "";
    doc.flaggedReview.qcResolvedByEmail = (actor.email || "").trim().toLowerCase();

    if (decision === "approved" && doc.teamLeadReview?.required) {
      doc.teamLeadReview.status = "resolved";
    }

    await doc.save();

    res.json({
      success: true,
      message:
        decision === "approved"
          ? "Issue resolved — valid reason accepted"
          : "Issue not resolved — reason not accepted",
      data: formatRow(doc, formType),
    });
  } catch (error) {
    console.error("resolveFlaggedReview error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to resolve flagged form",
      error: error.message,
    });
  }
};

module.exports = {
  listFlaggedReviews,
  forwardToQcAdmin,
  resolveFlaggedReview,
};
