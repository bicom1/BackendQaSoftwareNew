const Evaluation = require("../models/Evaluation");
const Escalation = require("../models/Escalation");
const {
  normalizeRole,
  isSuperAdmin,
  isQcRole,
  isQcAdmin,
} = require("../helpers/roles");
const {
  hasUnansweredThreads,
  isDiscussionComplete,
  findTeamLeadersByEmail,
  teamLeaderNamesMatchFilter,
  isAssociatedTeamLeadUser,
} = require("../helpers/teamLeadReview");

const isFormSubmitter = (user, doc) => {
  const userId = String(user._id);
  const email = (user.email || "").trim().toLowerCase();
  if (doc.owner && String(doc.owner) === userId) return true;
  if ((doc.useremail || "").trim().toLowerCase() === email) return true;
  if ((doc.evaluatedby || "").trim().toLowerCase() === email) return true;
  return false;
};

const buildListFilter = async (actor) => {
  const role = normalizeRole(actor.role);
  const base = { "teamLeadReview.required": true };

  if (isSuperAdmin(role)) {
    return base;
  }

  const leaders = await findTeamLeadersByEmail(actor.email);
  const nameFilter = teamLeaderNamesMatchFilter(leaders);
  if (nameFilter) {
    return { ...base, teamleader: nameFilter };
  }

  const email = (actor.email || "").trim().toLowerCase();
  const submitterFilter = {
    $or: [
      { owner: actor._id },
      { useremail: email },
      { evaluatedby: email },
    ],
  };

  if (isQcRole(role)) {
    return { ...base, ...submitterFilter };
  }

  return { ...base, ...submitterFilter };
};

const formatSubmission = (doc, formType = "evaluation") => {
  const row = doc.toObject ? doc.toObject() : doc;
  return {
    ...row,
    formType,
    teamLeadReview: row.teamLeadReview || { required: false },
  };
};

const findReviewableSubmission = async (id) => {
  let doc = await Evaluation.findById(id);
  if (doc) {
    return { doc, Model: Evaluation, formType: "evaluation" };
  }
  doc = await Escalation.findById(id);
  if (doc) {
    return { doc, Model: Escalation, formType: "escalation" };
  }
  return null;
};

const mergeReviewRows = (evalRows, escRows) =>
  [
    ...evalRows.map((row) => ({ ...row, formType: "evaluation" })),
    ...escRows.map((row) => ({ ...row, formType: "escalation" })),
  ].sort(
    (a, b) =>
      new Date(b.teamLeadReview?.routedAt || b.createdAt) -
      new Date(a.teamLeadReview?.routedAt || a.createdAt)
  );

const queryBothCollections = async (filter, { skip, limit }) => {
  const sort = { "teamLeadReview.routedAt": -1, createdAt: -1 };
  const [evalRows, escRows, evalTotal, escTotal] = await Promise.all([
    Evaluation.find(filter).sort(sort).lean(),
    Escalation.find(filter).sort(sort).lean(),
    Evaluation.countDocuments(filter),
    Escalation.countDocuments(filter),
  ]);

  const merged = mergeReviewRows(evalRows, escRows);
  const total = evalTotal + escTotal;
  const data =
    skip != null && limit != null
      ? merged.slice(skip, skip + limit)
      : merged;

  return { data, total };
};

const canViewSubmission = async (user, doc) => {
  const role = normalizeRole(user.role);
  if (isSuperAdmin(role)) return true;
  if (isFormSubmitter(user, doc)) return true;
  return isAssociatedTeamLeadUser(user, doc);
};

/** GET /api/team-lead-reviews */
exports.listTeamLeadReviews = async (req, res) => {
  try {
    const filter = await buildListFilter(req.user);
    if (!filter) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to view team lead reviews",
      });
    }

    const { status = "", page = "1", limit = "20" } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    if (status) {
      filter["teamLeadReview.status"] = status;
    } else if (req.query.openOnly === "1" || req.query.openOnly === "true") {
      filter["teamLeadReview.status"] = { $ne: "resolved" };
    }

    const { data, total } = await queryBothCollections(filter, {
      skip,
      limit: limitNum,
    });

    res.json({
      success: true,
      page: pageNum,
      limit: limitNum,
      total,
      data,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to load team lead reviews",
    });
  }
};

/** GET /api/team-lead-reviews/count */
exports.countTeamLeadReviews = async (req, res) => {
  try {
    const filter = await buildListFilter(req.user);
    if (!filter) {
      return res.status(403).json({ success: false, message: "Not allowed" });
    }

    const openFilter = {
      ...filter,
      "teamLeadReview.status": { $ne: "resolved" },
    };
    const pendingFilter = { ...filter, "teamLeadReview.status": "pending" };
    const awaitingFilter = {
      ...filter,
      "teamLeadReview.status": "awaiting_qc_response",
    };
    const discussedFilter = {
      ...filter,
      "teamLeadReview.status": "discussed",
    };

    const [
      pendingEval,
      pendingEsc,
      awaitingEval,
      awaitingEsc,
      discussedEval,
      discussedEsc,
      openEval,
      openEsc,
    ] = await Promise.all([
      Evaluation.countDocuments(pendingFilter),
      Escalation.countDocuments(pendingFilter),
      Evaluation.countDocuments(awaitingFilter),
      Escalation.countDocuments(awaitingFilter),
      Evaluation.countDocuments(discussedFilter),
      Escalation.countDocuments(discussedFilter),
      Evaluation.countDocuments(openFilter),
      Escalation.countDocuments(openFilter),
    ]);

    const openCount = openEval + openEsc;

    res.json({
      success: true,
      pending: pendingEval + pendingEsc,
      awaiting: awaitingEval + awaitingEsc,
      discussed: discussedEval + discussedEsc,
      total: openCount,
      count: openCount,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to count reviews",
    });
  }
};

/** GET /api/team-lead-reviews/:evaluationId */
exports.getTeamLeadReview = async (req, res) => {
  try {
    const found = await findReviewableSubmission(req.params.evaluationId);
    if (!found || !found.doc.teamLeadReview?.required) {
      return res.status(404).json({
        success: false,
        message: "Team lead review not found",
      });
    }

    if (!(await canViewSubmission(req.user, found.doc))) {
      return res.status(403).json({ success: false, message: "Not allowed" });
    }

    res.json({
      success: true,
      data: formatSubmission(found.doc, found.formType),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to load review",
    });
  }
};

/** POST /api/team-lead-reviews/:evaluationId/questions */
exports.askTeamLeadQuestion = async (req, res) => {
  try {
    const question = (req.body?.question || "").trim();
    if (question.length < 10) {
      return res.status(400).json({
        success: false,
        message: "Question must be at least 10 characters",
      });
    }

    const found = await findReviewableSubmission(req.params.evaluationId);
    if (!found || !found.doc.teamLeadReview?.required) {
      return res.status(404).json({
        success: false,
        message: "Team lead review not found",
      });
    }

    const { doc, formType } = found;
    const role = normalizeRole(req.user.role);
    const canAsk =
      isSuperAdmin(role) || (await isAssociatedTeamLeadUser(req.user, doc));

    if (!canAsk) {
      return res.status(403).json({
        success: false,
        message: "Only the associated team lead can ask questions on this form",
      });
    }

    doc.teamLeadReview.threads.push({
      question,
      askedByName: req.user.name || "Team Lead",
      askedByEmail: req.user.email || "",
      askedAt: new Date(),
    });
    doc.teamLeadReview.status = "awaiting_qc_response";
    await doc.save();

    res.status(201).json({
      success: true,
      message: "Question sent to submitter",
      data: formatSubmission(doc, formType),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to ask question",
    });
  }
};

/** POST /api/team-lead-reviews/:evaluationId/threads/:threadId/answer */
exports.answerTeamLeadQuestion = async (req, res) => {
  try {
    const answer = (req.body?.answer || "").trim();
    if (answer.length < 10) {
      return res.status(400).json({
        success: false,
        message: "Answer must be at least 10 characters",
      });
    }

    const found = await findReviewableSubmission(req.params.evaluationId);
    if (!found || !found.doc.teamLeadReview?.required) {
      return res.status(404).json({
        success: false,
        message: "Team lead review not found",
      });
    }

    const { doc, formType } = found;
    const role = normalizeRole(req.user.role);
    const canAnswer =
      isFormSubmitter(req.user, doc) ||
      isQcAdmin(role) ||
      isSuperAdmin(role);

    if (!canAnswer) {
      return res.status(403).json({
        success: false,
        message: "You can only answer questions on your own submissions",
      });
    }

    const thread = doc.teamLeadReview.threads.id(req.params.threadId);
    if (!thread) {
      return res.status(404).json({
        success: false,
        message: "Question thread not found",
      });
    }

    thread.answer = answer;
    thread.answeredByName = req.user.name || "Submitter";
    thread.answeredByEmail = req.user.email || "";
    thread.answeredAt = new Date();

    // Never auto-resolve — team lead must mark "resolved" after discussion
    doc.teamLeadReview.status = hasUnansweredThreads(doc.teamLeadReview)
      ? "awaiting_qc_response"
      : "discussed";

    await doc.save();

    res.json({
      success: true,
      message: isDiscussionComplete(doc.teamLeadReview)
        ? "Answer submitted. Team lead can now resolve the issue."
        : "Answer submitted",
      data: formatSubmission(doc, formType),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to submit answer",
    });
  }
};

/** PATCH /api/team-lead-reviews/:evaluationId/resolve */
exports.resolveTeamLeadReview = async (req, res) => {
  try {
    const found = await findReviewableSubmission(req.params.evaluationId);
    if (!found || !found.doc.teamLeadReview?.required) {
      return res.status(404).json({
        success: false,
        message: "Team lead review not found",
      });
    }

    const { doc, formType } = found;
    const role = normalizeRole(req.user.role);
    const canResolve =
      isSuperAdmin(role) || (await isAssociatedTeamLeadUser(req.user, doc));

    if (!canResolve) {
      return res.status(403).json({ success: false, message: "Not allowed" });
    }

    if (!isDiscussionComplete(doc.teamLeadReview)) {
      return res.status(400).json({
        success: false,
        message:
          "Discuss first: ask at least one question and wait for the submitter to answer before resolving",
      });
    }

    doc.teamLeadReview.status = "resolved";
    await doc.save();

    res.json({
      success: true,
      message: "The issue is resolved",
      data: formatSubmission(doc, formType),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to resolve review",
    });
  }
};
