import type { Role } from "@/generated/prisma/enums";

const hasRole = (role: Role, allowedRoles: Role[]) => allowedRoles.includes(role);

export const canViewDashboard = (role: Role) => hasRole(role, ["ADMIN", "NUTRICAO", "ENFERMAGEM", "MEDICO"]);
export const canViewClinicalRecord = (role: Role) => hasRole(role, ["ADMIN", "NUTRICAO", "ENFERMAGEM", "MEDICO"]);
export const canViewReports = (role: Role) => hasRole(role, ["ADMIN", "NUTRICAO", "MEDICO"]);
export const canExportPatientReports = (role: Role) => hasRole(role, ["ADMIN", "NUTRICAO", "MEDICO"]);
export const canManageUsers = (role: Role) => role === "ADMIN";
export const canManagePatients = (role: Role) => hasRole(role, ["ADMIN", "NUTRICAO"]);
export const canManageMenu = (role: Role) => hasRole(role, ["ADMIN", "NUTRICAO"]);
export const canManagePrescriptions = (role: Role) => hasRole(role, ["ADMIN", "NUTRICAO"]);
export const canRegisterMeals = (role: Role) => hasRole(role, ["ADMIN", "NUTRICAO", "ENFERMAGEM"]);
export const canReviewMeals = (role: Role) => hasRole(role, ["ADMIN", "NUTRICAO"]);
export const canViewAudit = (role: Role) => hasRole(role, ["ADMIN", "AUDITOR"]);
export const canViewGovernance = (role: Role) => hasRole(role, ["ADMIN", "AUDITOR"]);
export const canManageGovernance = (role: Role) => role === "ADMIN";

export const defaultRouteForRole = (role: Role) => (canViewDashboard(role) ? "/dashboard" : "/audit");

export const assertAllowed = (allowed: boolean) => {
  if (!allowed) {
    throw new Error("Perfil sem permissao para esta acao.");
  }
};
