const TeamLeader = require("../models/TeamLeader");
const User = require("../models/usermodel");
const { normalizeRole } = require("./roles");
const { applyFlaggedReviewRouting } = require("./flaggedReview");

const LOW_SCORE_THRESHOLD = Number(process.env.LOW_SCORE_THRESHOLD) || 40;
const MAX_RATING = 96;

const escapeRegex = (value) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const findTeamLeaderByName = async (name) => {
  const trimmed = (name || "").trim();
  if (!trimmed) return null;
  return TeamLeader.findOne({
    name: { $regex: new RegExp(`^${escapeRegex(trimmed)}$`, "i") },
  }).lean();
};

const findTeamLeadersByEmail = async (email) => {
  const normalized = (email || "").trim().toLowerCase();
  if (!normalized) return [];
  return TeamLeader.find({
    email: { $regex: new RegExp(`^${escapeRegex(normalized)}$`, "i") },
  }).lean();
};

const teamLeaderNamesMatchFilter = (leaders) => {
  if (!leaders?.length) return null;
  return {
    $in: leaders.map((l) => new RegExp(`^${escapeRegex(l.name.trim())}$`, "i")),
  };
};

const isAssociatedTeamLeadUser = async (user, evaluation) => {
  const leaders = await findTeamLeadersByEmail(user?.email);
  if (!leaders.length || !evaluation?.teamleader) return false;
  const tlName = evaluation.teamleader.trim().toLowerCase();
  return leaders.some((l) => l.name.trim().toLowerCase() === tlName);
};

const buildTeamLeadReview = async (teamleader, thresholdLabel) => {
  const leader = await findTeamLeaderByName(teamleader);
  return {
    required: true,
    status: "pending",
    routedAt: new Date(),
    teamLeaderName: teamleader,
    teamLeaderEmail: leader?.email || "",
    lowScoreThreshold: thresholdLabel,
    threads: [],
  };
};

/**
 * When any user submits a low-score evaluation, flag it for the associated
 * team leader to review and ask follow-up questions.
 */
const applyLowScoreTeamLeadRouting = async (payload) => {
  const rating = Number(payload.rating) || 0;
  if (rating >= LOW_SCORE_THRESHOLD || !payload.teamleader) {
    return payload;
  }

  let submitterRole = normalizeRole(payload.submittedByRole);
  if (!submitterRole && payload.owner) {
    const owner = await User.findById(payload.owner).select("role").lean();
    submitterRole = normalizeRole(owner?.role);
  }

  if (submitterRole) {
    payload.submittedByRole = submitterRole;
  }

  payload.teamLeadReview = await buildTeamLeadReview(
    payload.teamleader,
    LOW_SCORE_THRESHOLD
  );
  applyFlaggedReviewRouting(payload, "evaluation");

  return payload;
};

/**
 * Escalations with a bad user rating are routed to the associated team lead.
 */
const applyEscalationTeamLeadRouting = async (payload) => {
  const rating = (payload.userrating || "").trim().toLowerCase();
  if (rating !== "bad" || !payload.teamleader) {
    return payload;
  }

  let submitterRole = normalizeRole(payload.submittedByRole);
  if (!submitterRole && payload.owner) {
    const owner = await User.findById(payload.owner).select("role").lean();
    submitterRole = normalizeRole(owner?.role);
  }

  if (submitterRole) {
    payload.submittedByRole = submitterRole;
  }

  payload.teamLeadReview = await buildTeamLeadReview(payload.teamleader, "bad");
  applyFlaggedReviewRouting(payload, "escalation");

  return payload;
};

const hasUnansweredThreads = (review) =>
  Array.isArray(review?.threads) &&
  review.threads.some((t) => t.question && !t.answer?.trim());

/** At least one Q&A and every question answered — ready for team lead to resolve */
const isDiscussionComplete = (review) => {
  const threads = review?.threads || [];
  if (!threads.length) return false;
  return threads.every(
    (t) => t.question?.trim() && t.answer?.trim()
  );
};

module.exports = {
  LOW_SCORE_THRESHOLD,
  MAX_RATING,
  findTeamLeaderByName,
  findTeamLeadersByEmail,
  teamLeaderNamesMatchFilter,
  isAssociatedTeamLeadUser,
  applyLowScoreTeamLeadRouting,
  applyEscalationTeamLeadRouting,
  buildTeamLeadReview,
  hasUnansweredThreads,
  isDiscussionComplete,
};
