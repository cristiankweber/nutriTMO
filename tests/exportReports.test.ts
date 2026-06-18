import ExcelJS from "exceljs";
import { describe, expect, it, vi } from "vitest";
import { buildMealNutrientReport } from "../src/lib/clinical/calculations";
import type { PatientReportExportData } from "../src/lib/exports/patientReport";

vi.mock("@/lib/db", () => ({ db: {} }));

const loadPatientReportBuilders = async () => {
  const reportModule = await import("../src/lib/exports/patientReport");
  return {
    buildPatientReportPdf: reportModule.buildPatientReportPdf,
    buildPatientReportXlsx: reportModule.buildPatientReportXlsx,
  };
};

const makePatientReportData = (): PatientReportExportData => {
  const date = new Date("2026-06-12T00:00:00");
  const mealReport = buildMealNutrientReport([
    {
      mealType: "ALMOCO",
      status: "REVISADA",
      items: [
        {
          consumedKcal: 240,
          consumedProtein: 11,
          consumedCarbs: 32,
          consumedFat: 6,
          consumedSodium: 180,
          manuallyReviewed: true,
        },
      ],
    },
  ]);

  return {
    generatedAt: new Date("2026-06-12T10:00:00"),
    date,
    admissionId: "adm-demo",
    patientCode: "PCT-DEMO",
    bedName: "TMO-01",
    transplantType: "Autologo",
    transplantDay: "D+7",
    admissionDate: new Date("2026-06-05T00:00:00"),
    clinicalNotes: "Paciente ficticio para teste.",
    currentPrescription: {
      date,
      dietType: "Oral",
      consistency: "Normal",
      restrictions: "Sem restricoes no teste.",
      kcalTarget: 1800,
      proteinTarget: 80,
      fluidRestriction: null,
      supplementsPlan: "Suplemento teste.",
    },
    summary: {
      totalConsumedKcal: 240,
      kcalTarget: 1800,
      kcalTargetPercent: 13.3,
      totalConsumedProtein: 11,
      proteinTarget: 80,
      proteinTargetPercent: 13.8,
      missingMealsCount: 2,
      alertLevel: "Cinza",
      generatedAt: new Date("2026-06-12T10:01:00"),
    },
    mealReport,
    dailyReportText: "Resumo nutricional de teste.",
    mealReportText: "Relatorio por refeicao de teste.",
    meals: [
      {
        id: "meal-demo",
        mealType: "Almoco",
        status: "Revisada",
        imageQuality: "Adequada",
        confidence: "Alta",
        notes: "Sem intercorrencias.",
        createdByName: "Nutricionista Demo",
        reviewedByName: "Nutricionista Demo",
        items: [
          {
            foodName: "Arroz demo",
            category: "Carboidrato",
            servedPortionMultiplier: 1,
            consumedPercent: "100%",
            servedKcal: 240,
            consumedKcal: 240,
            servedCarbs: 32,
            consumedCarbs: 32,
            servedProtein: 11,
            consumedProtein: 11,
            servedFat: 6,
            consumedFat: 6,
            servedSodium: 180,
            consumedSodium: 180,
            manuallyReviewed: true,
            notes: "Teste.",
          },
        ],
      },
    ],
  };
};

describe("exportacao local auditavel", () => {
  it("gera XLSX com abas e conteudo clinico minimo", async () => {
    const { buildPatientReportXlsx } = await loadPatientReportBuilders();
    const workbook = new ExcelJS.Workbook();
    const buffer = await buildPatientReportXlsx(makePatientReportData());
    await workbook.xlsx.load(buffer as unknown as Parameters<typeof workbook.xlsx.load>[0]);

    expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual([
      "Resumo",
      "Relatorio_por_refeicao",
      "Itens_registrados",
      "Metadados",
    ]);
    expect(workbook.getWorksheet("Resumo")?.getCell("B3").value).toBe("PCT-DEMO");
    expect(workbook.getWorksheet("Itens_registrados")?.getCell("D2").value).toBe("Arroz demo");
    expect(workbook.getWorksheet("Metadados")?.getCell("B2").value).toContain("Google Sheets");
  });

  it("gera PDF local valido", async () => {
    const { buildPatientReportPdf } = await loadPatientReportBuilders();
    const buffer = await buildPatientReportPdf(makePatientReportData());

    expect(buffer.subarray(0, 4).toString()).toBe("%PDF");
    expect(buffer.byteLength).toBeGreaterThan(1000);
  });
});
