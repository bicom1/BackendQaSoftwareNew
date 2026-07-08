const mongoose = require("mongoose");
const User = require("../models/usermodel");
const {
  ROLES,
  normalizeRole,
  isQcAdmin,
  isSuperAdmin,
  getRoleQueryVariants,
} = require("./roles");

/** Same published logic as evaluation/escalation list APIs */
const EVAL_ESC_PUBLISHED_MATCH = {
  $or: [{ status: "published" }, { submissionSource: "frontend" }],
};

const escapeRegex = (value) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const emailMatch = (email) => {
  if (!email) return null;
  const rx = new RegExp(`^${escapeRegex(email.trim())}$`, "i");
  return {
    $or: [
      { useremail: { $regex: rx } },
      { userEmail: { $regex: rx } },
      { email: { $regex: rx } },
      { evaluatedby: { $regex: rx } },
      { evaluatedBy: { $regex: rx } },
    ],
  };
};

const nameMatch = (name) => {
  if (!name || !name.trim()) return null;
  const rx = new RegExp(`^${escapeRegex(name.trim())}$`, "i");
  return { evaluatedby: { $regex: rx } };
};

const ownerMatch = (userId) => {
  if (!userId) return null;
  const id =
    userId instanceof mongoose.Types.ObjectId
      ? userId
      : new mongoose.Types.ObjectId(String(userId));
  return { owner: id };
};

const buildSingleUserScope = (user) => {
  if (!user) return { _id: null };

  const parts = [];
  const userId = user._id || user.id;
  const email = (user.email || "").trim();
  const name = (user.name || "").trim();

  if (userId) {
    const idStr = String(userId);
    const ownerClauses = [{ owner: userId }, { owner: idStr }];
    if (mongoose.Types.ObjectId.isValid(idStr)) {
      ownerClauses.push({
        owner: new mongoose.Types.ObjectId(idStr),
      });
    }
    parts.push(
      ownerClauses.length === 1 ? ownerClauses[0] : { $or: ownerClauses }
    );
  }

  const emailClause = emailMatch(email);
  if (emailClause) parts.push(emailClause);

  if (name) {
    const nameRx = new RegExp(escapeRegex(name), "i");
    parts.push({ evaluatedby: { $regex: nameRx } });
    const firstName = name.split(/\s+/)[0];
    if (firstName && firstName.length > 1 && firstName.toLowerCase() !== name.toLowerCase()) {
      parts.push({
        evaluatedby: {
          $regex: new RegExp(`^${escapeRegex(firstName)}`, "i"),
        },
      });
    }
  }

  if (!parts.length) return { _id: null };
  return parts.length === 1 ? parts[0] : { $or: parts };
};

const resolveUserScopeById = async (userId, qcUsers = []) => {
  const id = String(userId || "").trim();
  if (!id) return null;

  let target = qcUsers.find((u) => String(u._id) === id);
  if (!target) {
    target = await User.findById(id).select("_id name email role").lean();
  }

  if (!target) return { _id: null };
  return buildSingleUserScope(target);
};

const getQcTeamUsers = async () => {
  const variants = new Set();
  [ROLES.QC_USER, ROLES.QC_ADMIN].forEach((r) => {
    getRoleQueryVariants(r).forEach((v) => variants.add(v));
  });
  return User.find({
    role: {
      $in: [...variants].map(
        (v) => new RegExp(`^${v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i")
      ),
    },
  })
    .select("_id name email role")
    .lean();
};

const resolveQcSubmissionScope = async (actor) => {
  const role = normalizeRole(actor.role);

  if (isSuperAdmin(role)) {
    const qcUsers = await getQcTeamUsers();
    return {
      scope: "all",
      qcUsers,
      match: {},
    };
  }

  if (isQcAdmin(role)) {
    const qcUsers = await getQcTeamUsers();
    const ors = [
      buildSingleUserScope(actor),
      ...qcUsers.flatMap((u) => [
        ownerMatch(u._id),
        emailMatch(u.email),
        nameMatch(u.name),
      ]),
    ].filter(Boolean);

    const uniqueOrs = ors.reduce(
      (acc, clause) => {
        const key = JSON.stringify(clause);
        if (!acc.seen.has(key)) {
          acc.seen.add(key);
          acc.list.push(clause);
        }
        return acc;
      },
      { seen: new Set(), list: [] }
    ).list;

    return {
      scope: "team",
      qcUsers: [actor, ...qcUsers],
      match: uniqueOrs.length ? { $or: uniqueOrs } : buildSingleUserScope(actor),
    };
  }

  if (normalizeRole(role) === ROLES.QC_USER) {
    return {
      scope: "self",
      qcUsers: [actor],
      match: buildSingleUserScope(actor),
    };
  }

  return { scope: "none", qcUsers: [], match: { _id: null } };
};

const combineMatch = (scopeMatch, extra) => {
  if (!scopeMatch || Object.keys(scopeMatch).length === 0) {
    return extra;
  }
  return { $and: [scopeMatch, extra] };
};

const evalEscMatch = (scopeMatch) =>
  combineMatch(scopeMatch, EVAL_ESC_PUBLISHED_MATCH);

const marketingMatch = (scopeMatch) => scopeMatch;

const lastNDays = (n) => {
  const start = new Date();
  start.setDate(start.getDate() - (n - 1));
  start.setHours(0, 0, 0, 0);
  return start;
};

const fillLastNDays = (rows, days = 5) => {
  const map = Object.fromEntries(
    rows.map((r) => [r._id || r.date, r.count || 0])
  );
  const result = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    result.push({ date: key, count: map[key] || 0 });
  }
  return result;
};

const buildDateRangeMatch = (startDate, endDate) => {
  if (!startDate && !endDate) return null;
  const createdAt = {};
  if (startDate) {
    const start = new Date(startDate);
    if (!Number.isNaN(start.getTime())) {
      start.setHours(0, 0, 0, 0);
      createdAt.$gte = start;
    }
  }
  if (endDate) {
    const end = new Date(endDate);
    if (!Number.isNaN(end.getTime())) {
      end.setHours(23, 59, 59, 999);
      createdAt.$lte = end;
    }
  }
  return Object.keys(createdAt).length ? { createdAt } : null;
};

const buildSearchMatch = (search, searchField = "all") => {
  const term = (search || "").trim();
  if (!term) return null;

  const rx = new RegExp(escapeRegex(term), "i");

  const fieldQueries = {
    agentName: [{ agentName: rx }],
    teamleader: [{ teamleader: rx }],
    leadID: /^\d+$/.test(term)
      ? [{ leadID: Number(term) }, { leadID: term }]
      : [{ leadID: rx }],
    mod: [{ mod: rx }],
    rating: [{ rating: rx }],
    severity: [{ escSeverity: rx }],
    issue: [{ issueIden: rx }],
    source: [{ source: rx }],
    branch: [{ branch: rx }],
    quality: [{ leadQuality: rx }],
    submitter: [
      { evaluatedby: rx },
      { evaluatedBy: rx },
      { useremail: rx },
      { userEmail: rx },
    ],
  };

  if (searchField && searchField !== "all" && fieldQueries[searchField]) {
    return { $or: fieldQueries[searchField] };
  }

  const ors = [
    { agentName: rx },
    { useremail: rx },
    { userEmail: rx },
    { evaluatedby: rx },
    { evaluatedBy: rx },
    { mod: rx },
    { escSeverity: rx },
    { issueIden: rx },
    { source: rx },
    { branch: rx },
    { leadQuality: rx },
    { teamleader: rx },
    { rating: rx },
    { comments: rx },
    { escComments: rx },
  ];
  if (/^\d+$/.test(term)) {
    ors.push({ leadID: Number(term) }, { leadID: term });
  }
  return { $or: ors };
};

const applyQueryFilters = (baseMatch, { startDate, endDate, search, searchField }) => {
  const parts = [baseMatch];
  const datePart = buildDateRangeMatch(startDate, endDate);
  const searchPart = buildSearchMatch(search, searchField);
  if (datePart) parts.push(datePart);
  if (searchPart) parts.push(searchPart);
  if (parts.length === 1) return parts[0];
  return { $and: parts };
};

const resolveSubmitterName = (doc) =>
  doc?.owner?.name ||
  doc?.evaluatedby ||
  doc?.evaluatedBy ||
  doc?.useremail ||
  doc?.userEmail ||
  "Unknown";

const mergeQueryWithQcScope = async (actor, baseQuery) => {
  if (!actor) return baseQuery;
  const role = normalizeRole(actor.role);
  if (role !== ROLES.QC_USER && role !== ROLES.QC_ADMIN) {
    return baseQuery;
  }
  const { match } = await resolveQcSubmissionScope(actor);
  const scopePart = evalEscMatch(match);
  return { $and: [baseQuery, scopePart] };
};

module.exports = {
  EVAL_ESC_PUBLISHED_MATCH,
  evalEscMatch,
  marketingMatch,
  resolveQcSubmissionScope,
  lastNDays,
  fillLastNDays,
  getQcTeamUsers,
  resolveSubmitterName,
  buildSingleUserScope,
  resolveUserScopeById,
  applyQueryFilters,
  mergeQueryWithQcScope,
};
