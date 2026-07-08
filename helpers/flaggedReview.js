const EVAL_CRITERIA = [
  "greetings",
  "responsetime",
  "accuracy",
  "building",
  "presenting",
  "closing",
  "bonus",
];

const buildEvaluationIssueSummary = (doc) => {
  const parts = [];
  if (doc.rating != null) parts.push(`Overall rating: ${doc.rating}`);
  if (doc.evaluationsummary?.trim()) parts.push(doc.evaluationsummary.trim());

  EVAL_CRITERIA.forEach((key) => {
    const c = doc[key];
    if (!c || typeof c !== "object") return;
    const bits = [];
    if (c.value) bits.push(String(c.value));
    if (c.reason) bits.push(String(c.reason));
    if (c.comment?.trim()) bits.push(c.comment.trim());
    if (bits.length) parts.push(`${key}: ${bits.join(" — ")}`);
  });

  return (parts.join("\n") || "Low score evaluation").slice(0, 2000);
};

const buildEscalationIssueSummary = (doc) => {
  const parts = [
    doc.userrating && `User rating: ${doc.userrating}`,
    doc.issueIden && `Issue identified: ${doc.issueIden}`,
    doc.escAction && `Action: ${doc.escAction}`,
    doc.escSeverity && `Severity: ${doc.escSeverity}`,
    doc.leadStatus && `Lead status: ${doc.leadStatus}`,
    doc.documentation?.trim(),
    doc.successmaration?.trim(),
    doc.otherAction?.trim(),
  ].filter(Boolean);

  return (parts.join("\n") || "Bad rating escalation").slice(0, 2000);
};

const buildFlaggedReview = (payload, formType = "evaluation") => ({
  required: true,
  flaggedAt: new Date(),
  issueSummary:
    formType === "escalation"
      ? buildEscalationIssueSummary(payload)
      : buildEvaluationIssueSummary(payload),
  status: "pending",
  forwardedAt: null,
  forwardedByName: "",
  forwardedByEmail: "",
  qcNote: "",
  qcResolvedAt: null,
  qcResolvedByName: "",
  qcResolvedByEmail: "",
});

const applyFlaggedReviewRouting = (payload, formType = "evaluation") => {
  if (!payload.teamLeadReview?.required) return payload;
  payload.flaggedReview = buildFlaggedReview(payload, formType);
  return payload;
};

const isFlaggedForm = (doc) =>
  Boolean(doc?.flaggedReview?.required || doc?.teamLeadReview?.required);

const FLAGGED_RETENTION_MS = 2 * 24 * 60 * 60 * 1000;

const getFlaggedRetentionCutoff = () =>
  new Date(Date.now() - FLAGGED_RETENTION_MS);

/**
 * Remove accepted/rejected flagged reviews older than 2 days.
 */
const purgeExpiredFlaggedReviews = async () => {
  const cutoff = getFlaggedRetentionCutoff();
  const purgeQuery = {
    "flaggedReview.status": { $in: ["approved", "rejected"] },
    "flaggedReview.qcResolvedAt": { $lt: cutoff },
  };
  const Evaluation = require("../models/Evaluation");
  const Escalation = require("../models/Escalation");
  await Promise.all([
    Evaluation.updateMany(purgeQuery, { $unset: { flaggedReview: "" } }),
    Escalation.updateMany(purgeQuery, { $unset: { flaggedReview: "" } }),
  ]);
};

const ensureFlaggedReviewOnDoc = (doc, formType = "evaluation") => {
  if (!doc || !isFlaggedForm(doc)) return doc;
  if (doc.flaggedReview?.required) {
    if (!doc.flaggedReview.issueSummary?.trim()) {
      doc.flaggedReview.issueSummary =
        formType === "escalation"
          ? buildEscalationIssueSummary(doc)
          : buildEvaluationIssueSummary(doc);
    }
    return doc;
  }
  doc.flaggedReview = buildFlaggedReview(doc, formType);
  return doc;
};

module.exports = {
  buildEvaluationIssueSummary,
  buildEscalationIssueSummary,
  buildFlaggedReview,
  applyFlaggedReviewRouting,
  isFlaggedForm,
  ensureFlaggedReviewOnDoc,
  FLAGGED_RETENTION_MS,
  getFlaggedRetentionCutoff,
  purgeExpiredFlaggedReviews,
};
