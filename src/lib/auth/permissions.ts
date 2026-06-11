import type { Role } from "@/generated/prisma/enums";

export const canManageUsers = (role: Role) => role === "ADMIN";
export const canManagePatients = (role: Role) => role === "ADMIN" || role === "NUTRICAO";
export const canManageMenu = (role: Role) => role === "ADMIN" || role === "NUTRICAO";
export const canManagePrescriptions = (role: Role) => role === "ADMIN" || role === "NUTRICAO";
export const canRegisterMeals = (role: Role) => role === "ADMIN" || role === "NUTRICAO" || role === "ENFERMAGEM";
export const canReviewMeals = (role: Role) => role === "ADMIN" || role === "NUTRICAO";
export const canViewAudit = (role: Role) => role === "ADMIN" || role === "AUDITOR";

export const assertAllowed = (allowed: boolean) => {
  if (!allowed) {
    throw new Error("Perfil sem permissao para esta acao.");
  }
};
