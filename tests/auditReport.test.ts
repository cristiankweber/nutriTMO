import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({ db: {} }));

import { buildAuditReportPdf, buildAuditReportXlsx, type AuditExportData } from "../src/lib/exports/auditReport";

const sampleData: AuditExportData = {
  generatedAt: new Date("2026-06-17T10:00:00"),
  limit: 2,
  logs: [
    {
      id: "log-1",
      createdAt: new Date("2026-06-17T09:30:00"),
      userName: "Admin Demo",
      action: "LOGIN",
      entityType: "User",
      entityId: "user-1",
      beforeJson: "",
      afterJson: "{\"role\":\"ADMIN\"}",
    },
    {
      id: "log-2",
      createdAt: new Date("2026-06-17T09:45:00"),
      userName: "Nutricao Demo",
      action: "UPDATE",
      entityType: "Admission",
      entityId: "adm-1",
      beforeJson: "{\"clinicalNotes\":null}",
      afterJson: "{\"clinicalNotes\":\"alto risco ficticio\"}",
    },
  ],
};

describe("export de auditoria", () => {
  it("gera XLSX com abas Auditoria e Metadados", async () => {
    const buffer = await buildAuditReportXlsx(sampleData);
    expect(buffer.byteLength).toBeGreaterThan(1000);
  });

  it("gera PDF com eventos exportados", async () => {
    const buffer = await buildAuditReportPdf(sampleData);
    expect(buffer.byteLength).toBeGreaterThan(1000);
    expect(buffer.subarray(0, 4).toString()).toBe("%PDF");
  });
});
