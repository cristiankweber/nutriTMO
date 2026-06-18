import { afterEach, describe, expect, it } from "vitest";
import {
  canExportPatientReports,
  canManageGovernance,
  canRegisterMeals,
  canReviewMeals,
  canViewAudit,
  canViewClinicalRecord,
  canViewDashboard,
  canViewGovernance,
  canViewReports,
  defaultRouteForRole,
} from "../src/lib/auth/permissions";
import { DEFAULT_IMAGE_RETENTION_DAYS, getImageRetentionCutoff, getImageRetentionDays } from "../src/lib/storage/retention";

const originalImageRetentionDays = process.env.IMAGE_RETENTION_DAYS;

afterEach(() => {
  process.env.IMAGE_RETENTION_DAYS = originalImageRetentionDays;
});

describe("governanca de perfis", () => {
  it("mantem auditor fora do fluxo clinico e dentro da governanca", () => {
    expect(canViewDashboard("AUDITOR")).toBe(false);
    expect(canViewClinicalRecord("AUDITOR")).toBe(false);
    expect(canViewReports("AUDITOR")).toBe(false);
    expect(canExportPatientReports("AUDITOR")).toBe(false);
    expect(canViewAudit("AUDITOR")).toBe(true);
    expect(canViewGovernance("AUDITOR")).toBe(true);
    expect(canManageGovernance("AUDITOR")).toBe(false);
    expect(defaultRouteForRole("AUDITOR")).toBe("/audit");
  });

  it("separa registro, revisao e relatorio entre perfis assistenciais", () => {
    expect(canRegisterMeals("ENFERMAGEM")).toBe(true);
    expect(canReviewMeals("ENFERMAGEM")).toBe(false);
    expect(canViewReports("ENFERMAGEM")).toBe(false);
    expect(canViewClinicalRecord("MEDICO")).toBe(true);
    expect(canViewReports("MEDICO")).toBe(true);
    expect(canRegisterMeals("MEDICO")).toBe(false);
    expect(defaultRouteForRole("MEDICO")).toBe("/dashboard");
  });
});

describe("retencao local de imagens", () => {
  it("usa padrao conservador quando a variavel nao esta configurada", () => {
    delete process.env.IMAGE_RETENTION_DAYS;
    expect(getImageRetentionDays()).toBe(DEFAULT_IMAGE_RETENTION_DAYS);
  });

  it("normaliza retencao configurada", () => {
    process.env.IMAGE_RETENTION_DAYS = "7.9";
    expect(getImageRetentionDays()).toBe(7);

    process.env.IMAGE_RETENTION_DAYS = "0";
    expect(getImageRetentionDays()).toBe(DEFAULT_IMAGE_RETENTION_DAYS);
  });

  it("calcula corte de retencao a partir da data informada", () => {
    process.env.IMAGE_RETENTION_DAYS = "10";
    expect(getImageRetentionCutoff(new Date("2026-06-11T12:00:00Z")).toISOString()).toBe("2026-06-01T12:00:00.000Z");
  });
});
