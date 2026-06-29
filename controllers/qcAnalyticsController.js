const Evaluation = require("../models/Evaluation");
const Escalation = require("../models/Escalation");
const Marketing = require("../models/Marketing");
const {
  normalizeRole,
  isQcAdmin,
  ROLES,
} = require("../helpers/roles");
const {
  evalEscMatch,
  marketingMatch,
  resolveQcSubmissionScope,
  lastNDays,
  fillLastNDays,
  resolveSubmitterName,
  buildSingleUserScope,
  applyQueryFilters,
} = require("../helpers/qcScope");

const dailyAggregate = (collection, match, days = 5) =>
  collection.aggregate([
    { $match: { ...match, createdAt: { $gte: lastNDays(days) } } },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

const enrichDoc = (doc) => ({
  ...doc,
  submitterName: resolveSubmitterName(doc),
});

const getTopSubmitters = async (match, scope) => {
  if (scope === "self") {
    return Evaluation.aggregate([
      { $match: match },
      { $group: { _id: "$agentName", formSubmit: { $sum: 1 } } },
      { $sort: { formSubmit: -1 } },
      { $limit: 5 },
    ]).then((rows) =>
      rows.map((r) => ({
        agentName: r._id || "Unknown Agent",
        formSubmit: r.formSubmit,
      }))
    );
  }

  return Evaluation.aggregate([
    { $match: match },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "ownerDoc",
      },
    },
    {
      $addFields: {
        submitterName: {
          $ifNull: [
            { $arrayElemAt: ["$ownerDoc.name", 0] },
            "$evaluatedby",
            "$useremail",
          ],
        },
      },
    },
    { $group: { _id: "$submitterName", formSubmit: { $sum: 1 } } },
    { $sort: { formSubmit: -1 } },
    { $limit: 5 },
  ]).then((rows) =>
    rows.map((r) => ({
      agentName: r._id || "Unknown",
      formSubmit: r.formSubmit,
    }))
  );
};

const getQcModuleDashboard = async (req, res) => {
  try {
    const actor = req.user;
    const actorRole = normalizeRole(actor.role);

    if (
      actorRole !== ROLES.QC_USER &&
      actorRole !== ROLES.QC_ADMIN &&
      actorRole !== ROLES.SUPER_ADMIN
    ) {
      return res.status(403).json({
        success: false,
        message: "QC dashboard is only available to QC roles",
      });
    }

    const { scope, qcUsers, match: scopeMatch } =
      await resolveQcSubmissionScope(actor);
    const evalEscFilter = evalEscMatch(scopeMatch);
    const marketingFilter = marketingMatch(scopeMatch);

    const [
      totalEvaluations,
      totalEscalations,
      totalMarketing,
      dailyEvalRows,
      dailyEscRows,
      severityAgg,
      topSubmitters,
      recentEvaluations,
      recentEscalations,
      recentMarketing,
    ] = await Promise.all([
      Evaluation.countDocuments(evalEscFilter),
      Escalation.countDocuments(evalEscFilter),
      Marketing.countDocuments(marketingFilter),
      dailyAggregate(Evaluation, evalEscFilter, 5),
      dailyAggregate(Escalation, evalEscFilter, 5),
      Escalation.aggregate([
        { $match: evalEscFilter },
        {
          $group: {
            _id: { $ifNull: ["$escSeverity", "Unknown"] },
            count: { $sum: 1 },
          },
        },
      ]),
      getTopSubmitters(evalEscFilter, scope),
      Evaluation.find(evalEscFilter)
        .sort({ createdAt: -1 })
        .limit(50)
        .populate("owner", "name email")
        .lean(),
      Escalation.find(evalEscFilter)
        .sort({ createdAt: -1 })
        .limit(50)
        .populate("owner", "name email")
        .lean(),
      Marketing.find(marketingFilter)
        .sort({ createdAt: -1 })
        .limit(50)
        .populate("owner", "name email")
        .lean(),
    ]);

    const severityCounts = Object.fromEntries(
      severityAgg.map((r) => [r._id, r.count])
    );

    const dailyEvaluations = fillLastNDays(dailyEvalRows, 5);
    const dailyEscalations = fillLastNDays(dailyEscRows, 5);

    const evaluations = recentEvaluations.map(enrichDoc);
    const escalations = recentEscalations.map(enrichDoc);
    const marketing = recentMarketing.map(enrichDoc);

    const recentActivity = [
      ...evaluations.slice(0, 5).map((e) => ({
        id: String(e._id),
        actorName: e.submitterName,
        action: "submitted evaluation",
        createdAt: e.publishedAt || e.createdAt,
      })),
      ...escalations.slice(0, 3).map((e) => ({
        id: String(e._id),
        actorName: e.submitterName,
        action: "submitted escalation",
        createdAt: e.publishedAt || e.createdAt,
      })),
    ]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 8);

    const qcTeamPerformance = await Promise.all(
      qcUsers.map(async (u) => {
        const userScope = buildSingleUserScope(u);
        const uEvalEsc = evalEscMatch(userScope);
        const uMarketing = marketingMatch(userScope);
        const [evaluationCount, escalationCount, marketingCount] =
          await Promise.all([
            Evaluation.countDocuments(uEvalEsc),
            Escalation.countDocuments(uEvalEsc),
            Marketing.countDocuments(uMarketing),
          ]);
        return {
          userId: String(u._id),
          name: u.name,
          email: u.email,
          role: normalizeRole(u.role),
          evaluationCount,
          escalationCount,
          marketingCount,
          totalSubmissions:
            evaluationCount + escalationCount + marketingCount,
        };
      })
    );

    qcTeamPerformance.sort((a, b) => b.totalSubmissions - a.totalSubmissions);

    res.json({
      success: true,
      scope,
      isAdmin: isQcAdmin(actorRole) || actorRole === ROLES.SUPER_ADMIN,
      actor: {
        id: String(actor._id),
        name: actor.name,
        email: actor.email,
        role: actorRole,
      },
      publishedCount: totalEvaluations,
      recentActivity,
      dailyEvaluations,
      dailyEscalations,
      topSubmitters,
      severityCounts,
      totalEscalations,
      totalEvaluations,
      totalMarketing,
      qcTeamPerformance,
      forms: {
        evaluations,
        escalations,
        marketing,
      },
    });
  } catch (error) {
    console.error("QC module dashboard error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to load QC dashboard",
      error: error.message,
    });
  }
};

const FORM_MODELS = {
  evaluations: { Model: Evaluation, matchFn: evalEscMatch },
  escalations: { Model: Escalation, matchFn: evalEscMatch },
  marketing: { Model: Marketing, matchFn: marketingMatch },
};

const getQcModuleForms = async (req, res) => {
  try {
    const actor = req.user;
    const actorRole = normalizeRole(actor.role);

    if (
      actorRole !== ROLES.QC_USER &&
      actorRole !== ROLES.QC_ADMIN &&
      actorRole !== ROLES.SUPER_ADMIN
    ) {
      return res.status(403).json({
        success: false,
        message: "QC forms access is only available to QC roles",
      });
    }

    const {
      type = "evaluations",
      search = "",
      searchField = "all",
      userId = "",
      startDate = "",
      endDate = "",
      page = "1",
      limit = "10",
    } = req.query;

    const formType = ["evaluations", "escalations", "marketing"].includes(type)
      ? type
      : "evaluations";
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(1000, Math.max(1, parseInt(limit, 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    const { scope, qcUsers, match: scopeMatch } =
      await resolveQcSubmissionScope(actor);
    const isAdmin =
      isQcAdmin(actorRole) || actorRole === ROLES.SUPER_ADMIN;

    let scopeForQuery = scopeMatch;
    if (userId && isAdmin) {
      const target = qcUsers.find((u) => String(u._id) === String(userId));
      if (target) {
        scopeForQuery = buildSingleUserScope(target);
      }
    }

    const { Model, matchFn } = FORM_MODELS[formType];
    const baseMatch = matchFn(scopeForQuery);
    const query = applyQueryFilters(baseMatch, {
      startDate,
      endDate,
      search,
      searchField,
    });

    const [total, rows] = await Promise.all([
      Model.countDocuments(query),
      Model.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate("owner", "name email")
        .lean(),
    ]);

    res.json({
      success: true,
      type: formType,
      data: rows.map(enrichDoc),
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.max(1, Math.ceil(total / limitNum)),
      qcUsers: isAdmin
        ? qcUsers.map((u) => ({
            userId: String(u._id),
            name: u.name,
            email: u.email,
            role: normalizeRole(u.role),
          }))
        : [],
    });
  } catch (error) {
    console.error("QC module forms error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to load QC forms",
      error: error.message,
    });
  }
};

module.exports = { getQcModuleDashboard, getQcModuleForms };
