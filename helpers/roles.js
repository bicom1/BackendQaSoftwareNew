/**
 * Enterprise RBAC — five canonical roles with domain separation.
 *
 * superadmin   → full system
 * agent_admin  → agent_user only
 * agent_user   → own profile
 * qc_admin     → qc_user only
 * qc_user      → own profile
 */

const ROLES = {
  SUPER_ADMIN: "superadmin",
  AGENT_ADMIN: "agent_admin",
  AGENT_USER: "agent_user",
  QC_ADMIN: "qc_admin",
  QC_USER: "qc_user",
};

const VALID_ROLES = Object.values(ROLES);

const LEGACY_ROLE_MAP = {
  admin: ROLES.SUPER_ADMIN,
  superadmin: ROLES.SUPER_ADMIN,
  "super admin": ROLES.SUPER_ADMIN,
  user: ROLES.AGENT_USER,
  agent: ROLES.AGENT_USER,
  "agent user": ROLES.AGENT_USER,
  agent_user: ROLES.AGENT_USER,
  "agent admin": ROLES.AGENT_ADMIN,
  agent_admin: ROLES.AGENT_ADMIN,
  "sales agent": ROLES.AGENT_USER,
  qc_admin: ROLES.QC_ADMIN,
  "qc admin": ROLES.QC_ADMIN,
  qc_user: ROLES.QC_USER,
  "qc user": ROLES.QC_USER,
  qc: ROLES.QC_USER,
};

const normalizeRole = (role) => {
  if (!role) return "";
  const key = role.toString().trim().toLowerCase().replace(/\s+/g, " ");
  const underscored = key.replace(/ /g, "_");
  if (VALID_ROLES.includes(underscored)) return underscored;
  if (VALID_ROLES.includes(key)) return key;
  return LEGACY_ROLE_MAP[key] || underscored;
};

const isSuperAdmin = (role) => normalizeRole(role) === ROLES.SUPER_ADMIN;
const isAgentAdmin = (role) => normalizeRole(role) === ROLES.AGENT_ADMIN;
const isAgentUser = (role) => normalizeRole(role) === ROLES.AGENT_USER;
const isQcAdmin = (role) => normalizeRole(role) === ROLES.QC_ADMIN;
const isQcUser = (role) => normalizeRole(role) === ROLES.QC_USER;

const isAgentRole = (role) => {
  const r = normalizeRole(role);
  return r === ROLES.AGENT_USER || r === ROLES.AGENT_ADMIN;
};

const isQcRole = (role) => {
  const r = normalizeRole(role);
  return r === ROLES.QC_USER || r === ROLES.QC_ADMIN;
};

/** Roles this actor may create via register-user */
const getManageableRoles = (actorRole) => {
  const actor = normalizeRole(actorRole);
  if (isSuperAdmin(actor)) return [...VALID_ROLES];
  if (isAgentAdmin(actor)) return [ROLES.AGENT_USER];
  if (isQcAdmin(actor)) return [ROLES.QC_USER];
  return [];
};

const canManageRole = (actorRole, targetRole) =>
  getManageableRoles(actorRole).includes(normalizeRole(targetRole));

/** Roles visible in user list for this actor */
const getVisibleUserRoles = (actorRole) => {
  const actor = normalizeRole(actorRole);
  if (isSuperAdmin(actor)) return [...VALID_ROLES];
  if (isAgentAdmin(actor)) return [ROLES.AGENT_USER];
  if (isQcAdmin(actor)) return [ROLES.QC_USER];
  return [];
};

const isUserManager = (role) => getManageableRoles(role).length > 0;

const getRoleQueryVariants = (canonicalRole) => {
  const target = normalizeRole(canonicalRole);
  const variants = new Set([target]);
  Object.entries(LEGACY_ROLE_MAP).forEach(([legacy, mapped]) => {
    if (mapped === target) variants.add(legacy);
  });
  return [...variants];
};

/** MongoDB $in regex list for all visible roles of an actor */
const buildVisibleRolesFilter = (actorRole) => {
  const visible = getVisibleUserRoles(actorRole);
  const variants = new Set();
  visible.forEach((r) =>
    getRoleQueryVariants(r).forEach((v) => variants.add(v))
  );
  return {
    $in: [...variants].map(
      (v) => new RegExp(`^${v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i")
    ),
  };
};

const PUBLIC_SIGNUP_ROLES = [ROLES.AGENT_USER, ROLES.QC_USER];

const isPublicSignupRole = (role) =>
  PUBLIC_SIGNUP_ROLES.includes(normalizeRole(role));

const isCreatableRole = (role) =>
  getManageableRoles(ROLES.SUPER_ADMIN).includes(normalizeRole(role));

module.exports = {
  ROLES,
  VALID_ROLES,
  PUBLIC_SIGNUP_ROLES,
  normalizeRole,
  isSuperAdmin,
  isAgentAdmin,
  isAgentUser,
  isQcAdmin,
  isQcUser,
  isAgentRole,
  isQcRole,
  isUserManager,
  getManageableRoles,
  canManageRole,
  getVisibleUserRoles,
  getRoleQueryVariants,
  buildVisibleRolesFilter,
  isPublicSignupRole,
  isCreatableRole,
};
