import ExcelJS from "exceljs";
import { buildMealNutrientReport, type MealNutrientReport } from "@/lib/clinical/calculations";
import { addDays, formatDate, formatDateTime, startOfLocalDay, toDateInputValue } from "@/lib/dates";
import { db } from "@/lib/db";
import {
  alertLabels,
  confidenceLabels,
  consumedPercentLabels,
  foodCategoryLabels,
  imageQualityLabels,
  mealStatusLabels,
  mealTypeLabels,
  transplantTypeLabels,
} from "@/lib/labels";
import { buildDailyReportText, buildMealReportText, getMealReportRows } from "@/lib/reporting/nutritionReport";
import { getDisplayTransplantDay } from "@/lib/transplantDay";

import { SimplePdfReport } from "./pdfReport";
import { type ExportFormat, safeFileSegment } from "./shared";

type PatientReportMealItem = {
  foodName: string;
  category: string;
  servedPortionMultiplier: number;
  consumedPercent: string;
  servedKcal: number;
  consumedKcal: number;
  servedCarbs: number;
  consumedCarbs: number;
  servedProtein: number;
  consumedProtein: number;
  servedFat: number;
  consumedFat: number;
  servedSodium: number;
  consumedSodium: number;
  manuallyReviewed: boolean;
  notes: string | null;
};

type PatientReportMeal = {
  id: string;
  mealType: string;
  status: string;
  imageQuality: string;
  confidence: string;
  notes: string | null;
  createdByName: string;
  reviewedByName: string | null;
  items: PatientReportMealItem[];
};

export type PatientReportExportData = {
  generatedAt: Date;
  date: Date;
  admissionId: string;
  patientCode: string;
  bedName: string;
  transplantType: string;
  transplantDay: string;
  admissionDate: Date;
  clinicalNotes: string | null;
  currentPrescription: {
    date: Date;
    dietType: string;
    consistency: string;
    restrictions: string | null;
    kcalTarget: number;
    proteinTarget: number;
    fluidRestriction: string | null;
    supplementsPlan: string | null;
  } | null;
  summary: {
    totalConsumedKcal: number;
    kcalTarget: number;
    kcalTargetPercent: number;
    totalConsumedProtein: number;
    proteinTarget: number;
    proteinTargetPercent: number;
    missingMealsCount: number;
    alertLevel: string;
    generatedAt: Date;
  } | null;
  mealReport: MealNutrientReport;
  dailyReportText: string;
  mealReportText: string;
  meals: PatientReportMeal[];
};

export async function getPatientReportExportData(admissionId: string, dateInput: Date): Promise<PatientReportExportData | null> {
  const date = startOfLocalDay(dateInput);
  const nextDate = addDays(date, 1);

  const [admission, summary, meals] = await Promise.all([
    db.admission.findUnique({
      where: { id: admissionId },
      include: {
        bed: true,
        patient: true,
        prescriptions: { where: { date: { lte: date } }, orderBy: { date: "desc" }, take: 1 },
      },
    }),
    db.nutritionDailySummary.findUnique({ where: { admissionId_date: { admissionId, date } } }),
    db.meal.findMany({
      where: { admissionId, date: { gte: date, lt: nextDate } },
      include: {
        createdBy: true,
        reviewedBy: true,
        items: { include: { foodItem: true } },
      },
      orderBy: [{ mealType: "asc" }, { createdAt: "asc" }],
    }),
  ]);

  if (!admission) return null;

  const activeMeals = meals.filter((meal) => meal.status !== "CANCELADA");
  const mealReport = buildMealNutrientReport(meals);
  const completeMeals = activeMeals.filter((meal) => meal.status === "FINALIZADA" || meal.status === "REVISADA").length;
  const reviewedMeals = activeMeals.filter((meal) => meal.status === "REVISADA").length;
  const dailyReportText = summary
    ? buildDailyReportText({
        kcal: summary.totalConsumedKcal,
        protein: summary.totalConsumedProtein,
        kcalPercent: summary.kcalTargetPercent,
        proteinPercent: summary.proteinTargetPercent,
        completeMeals,
        reviewedMeals,
        totalMeals: activeMeals.length,
        alertLevel: summary.alertLevel,
      })
    : "Sem resumo nutricional gerado para o periodo selecionado.";

  const prescription = admission.prescriptions[0] ?? null;

  return {
    generatedAt: new Date(),
    date,
    admissionId,
    patientCode: admission.patient.internalCode,
    bedName: admission.bed.name,
    transplantType: transplantTypeLabels[admission.transplantType],
    transplantDay: getDisplayTransplantDay(admission.transplantDay, admission.admissionDate, date) ?? "Nao informado",
    admissionDate: admission.admissionDate,
    clinicalNotes: admission.clinicalNotes,
    currentPrescription: prescription
      ? {
          date: prescription.date,
          dietType: prescription.dietType,
          consistency: prescription.consistency,
          restrictions: prescription.restrictions,
          kcalTarget: prescription.kcalTarget,
          proteinTarget: prescription.proteinTarget,
          fluidRestriction: prescription.fluidRestriction,
          supplementsPlan: prescription.supplementsPlan,
        }
      : null,
    summary: summary
      ? {
          totalConsumedKcal: summary.totalConsumedKcal,
          kcalTarget: summary.kcalTarget,
          kcalTargetPercent: summary.kcalTargetPercent,
          totalConsumedProtein: summary.totalConsumedProtein,
          proteinTarget: summary.proteinTarget,
          proteinTargetPercent: summary.proteinTargetPercent,
          missingMealsCount: summary.missingMealsCount,
          alertLevel: alertLabels[summary.alertLevel],
          generatedAt: summary.generatedAt,
        }
      : null,
    mealReport,
    dailyReportText,
    mealReportText: buildMealReportText({ date, report: mealReport }),
    meals: meals.map((meal) => ({
      id: meal.id,
      mealType: mealTypeLabels[meal.mealType],
      status: mealStatusLabels[meal.status],
      imageQuality: imageQualityLabels[meal.imageQuality],
      confidence: confidenceLabels[meal.confidence],
      notes: meal.notes,
      createdByName: meal.createdBy.name,
      reviewedByName: meal.reviewedBy?.name ?? null,
      items: meal.items.map((item) => ({
        foodName: item.foodItem.name,
        category: foodCategoryLabels[item.foodItem.category],
        servedPortionMultiplier: item.servedPortionMultiplier,
        consumedPercent: consumedPercentLabels[item.consumedPercent],
        servedKcal: item.servedKcal,
        consumedKcal: item.consumedKcal,
        servedCarbs: item.servedCarbs,
        consumedCarbs: item.consumedCarbs,
        servedProtein: item.servedProtein,
        consumedProtein: item.consumedProtein,
        servedFat: item.servedFat,
        consumedFat: item.consumedFat,
        servedSodium: item.servedSodium,
        consumedSodium: item.consumedSodium,
        manuallyReviewed: item.manuallyReviewed,
        notes: item.notes,
      })),
    })),
  };
}

export const patientReportFilename = (data: PatientReportExportData, format: ExportFormat) =>
  `nutritmo-relatorio-${safeFileSegment(data.patientCode)}-${toDateInputValue(data.date)}.${format}`;

export async function buildPatientReportXlsx(data: PatientReportExportData) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "NutriTMO";
  workbook.created = data.generatedAt;

  addSummarySheet(workbook, data);
  addMealReportSheet(workbook, data);
  addMealItemsSheet(workbook, data);
  addMetadataSheet(workbook, data);

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

export async function buildPatientReportPdf(data: PatientReportExportData) {
  const pdf = await SimplePdfReport.create();
  pdf.title("NutriTMO - Relatorio nutricional local", `Gerado em ${formatDateTime(data.generatedAt)}. Exportacao local, sem envio externo.`);

  pdf.section("Paciente e admissao");
  pdf.keyValue("Paciente demo", data.patientCode);
  pdf.keyValue("Leito", data.bedName);
  pdf.keyValue("Data do relatorio", formatDate(data.date));
  pdf.keyValue("Admissao", formatDate(data.admissionDate));
  pdf.keyValue("Transplante", `${data.transplantType} - ${data.transplantDay}`);
  pdf.keyValue("Observacoes", data.clinicalNotes ?? "Nenhuma observacao registrada.");

  pdf.section("Prescricao vigente");
  if (data.currentPrescription) {
    pdf.keyValue("Data", formatDate(data.currentPrescription.date));
    pdf.keyValue("Dieta", `${data.currentPrescription.dietType} - ${data.currentPrescription.consistency}`);
    pdf.keyValue("Metas", `${data.currentPrescription.kcalTarget.toFixed(0)} kcal/dia; ${data.currentPrescription.proteinTarget.toFixed(1)} g proteina/dia`);
    pdf.keyValue("Suplementos", data.currentPrescription.supplementsPlan ?? "Nao registrado.");
  } else {
    pdf.paragraph("Sem prescricao vigente cadastrada para a data selecionada.");
  }

  pdf.section("Resumo diario");
  if (data.summary) {
    pdf.keyValue("Kcal", `${data.summary.totalConsumedKcal.toFixed(0)} de ${data.summary.kcalTarget.toFixed(0)} kcal (${data.summary.kcalTargetPercent.toFixed(0)}%)`);
    pdf.keyValue("Proteina", `${data.summary.totalConsumedProtein.toFixed(1)} de ${data.summary.proteinTarget.toFixed(1)} g (${data.summary.proteinTargetPercent.toFixed(0)}%)`);
    pdf.keyValue("Alerta", data.summary.alertLevel);
  } else {
    pdf.paragraph("Sem resumo nutricional gerado para o periodo selecionado.");
  }
  pdf.paragraph(data.dailyReportText);

  pdf.section("Relatorio por refeicao");
  pdf.paragraph(data.mealReportText);
  pdf.table(
    [
      { header: "Refeicao", width: 88 },
      { header: "kcal", width: 52, align: "right" },
      { header: "% dia", width: 52, align: "right" },
      { header: "CHO", width: 52, align: "right" },
      { header: "PTN", width: 52, align: "right" },
      { header: "LIP", width: 52, align: "right" },
      { header: "Na (mg)", width: 52, align: "right" },
      { header: "Obs.", width: 107 },
    ],
    getMealReportRows(data.mealReport).map((row) => [
      row.label,
      row.totalConsumedKcal.toFixed(0),
      row.hasRecord || row.mealType === "TOTAL" ? `${row.kcalPercentOfDay.toFixed(0)}%` : "-",
      row.totalConsumedCarbs.toFixed(1),
      row.totalConsumedProtein.toFixed(1),
      row.totalConsumedFat.toFixed(1),
      row.totalConsumedSodium.toFixed(0),
      row.observations.join(", "),
    ]),
  );

  pdf.section("Itens registrados");
  const itemRows = data.meals.flatMap((meal) =>
    meal.items.map((item) => [
      meal.mealType,
      meal.status,
      item.foodName,
      `${item.consumedPercent}; ${item.consumedKcal.toFixed(0)} kcal; ${item.consumedProtein.toFixed(1)} g PTN; ${item.consumedSodium.toFixed(0)} mg Na`,
      item.notes ?? meal.notes ?? "-",
    ]),
  );
  if (itemRows.length > 0) {
    pdf.table(
      [
        { header: "Refeicao", width: 82 },
        { header: "Status", width: 72 },
        { header: "Item", width: 154 },
        { header: "Ingerido", width: 104 },
        { header: "Obs.", width: 95 },
      ],
      itemRows,
    );
  } else {
    pdf.paragraph("Nenhum item registrado no periodo selecionado.");
  }

  return pdf.save();
}

function addSummarySheet(workbook: ExcelJS.Workbook, data: PatientReportExportData) {
  const sheet = workbook.addWorksheet("Resumo");
  sheet.columns = [{ width: 28 }, { width: 72 }];
  sheet.addRows([
    ["NutriTMO - relatorio nutricional local", ""],
    ["Gerado em", formatDateTime(data.generatedAt)],
    ["Paciente demo", data.patientCode],
    ["Leito", data.bedName],
    ["Data do relatorio", formatDate(data.date)],
    ["Admissao", formatDate(data.admissionDate)],
    ["Transplante", `${data.transplantType} - ${data.transplantDay}`],
    ["Observacoes", data.clinicalNotes ?? "Nenhuma observacao registrada."],
    [],
    ["Prescricao vigente", ""],
    ["Dieta", data.currentPrescription ? `${data.currentPrescription.dietType} - ${data.currentPrescription.consistency}` : "Sem prescricao vigente."],
    ["Metas", data.currentPrescription ? `${data.currentPrescription.kcalTarget.toFixed(0)} kcal/dia; ${data.currentPrescription.proteinTarget.toFixed(1)} g proteina/dia` : "-"],
    ["Restricoes", data.currentPrescription?.restrictions ?? "-"],
    ["Suplementos", data.currentPrescription?.supplementsPlan ?? "-"],
    [],
    ["Resumo diario", ""],
    ["Kcal", data.summary ? `${data.summary.totalConsumedKcal.toFixed(0)} de ${data.summary.kcalTarget.toFixed(0)} kcal (${data.summary.kcalTargetPercent.toFixed(0)}%)` : "Sem resumo."],
    ["Proteina", data.summary ? `${data.summary.totalConsumedProtein.toFixed(1)} de ${data.summary.proteinTarget.toFixed(1)} g (${data.summary.proteinTargetPercent.toFixed(0)}%)` : "Sem resumo."],
    ["Sodio", data.mealReport.total.hasRecord ? `${data.mealReport.total.totalConsumedSodium.toFixed(0)} mg ingeridos no periodo` : "Sem registro de sodio no periodo."],
    ["Alerta", data.summary?.alertLevel ?? "-"],
    ["Texto do resumo diario", data.dailyReportText],
    ["Texto do relatorio por refeicao", data.mealReportText],
  ]);
  sheet.mergeCells("A1:B1");
  sheet.getCell("A1").font = { bold: true, size: 14, color: { argb: "FF1C1917" } };
  sheet.getColumn(2).alignment = { wrapText: true, vertical: "top" };
  sheet.eachRow((row) => {
    row.getCell(1).font = { bold: true, color: { argb: "FF44403C" } };
    row.alignment = { vertical: "top", wrapText: true };
  });
}

function addMealReportSheet(workbook: ExcelJS.Workbook, data: PatientReportExportData) {
  const sheet = workbook.addWorksheet("Relatorio_por_refeicao");
  sheet.columns = [
    { header: "Refeicao", key: "meal", width: 22 },
    { header: "kcal", key: "kcal", width: 12 },
    { header: "% kcal do dia", key: "kcalPercent", width: 16 },
    { header: "CHO (g)", key: "carbs", width: 12 },
    { header: "PTN (g)", key: "protein", width: 12 },
    { header: "LIP (g)", key: "fat", width: 12 },
    { header: "Na (mg)", key: "sodium", width: 12 },
    { header: "Observacoes", key: "observations", width: 46 },
  ];
  sheet.addRows(
    getMealReportRows(data.mealReport).map((row) => ({
      meal: row.label,
      kcal: row.totalConsumedKcal,
      kcalPercent: row.hasRecord || row.mealType === "TOTAL" ? row.kcalPercentOfDay : null,
      carbs: row.totalConsumedCarbs,
      protein: row.totalConsumedProtein,
      fat: row.totalConsumedFat,
      sodium: row.totalConsumedSodium,
      observations: row.observations.join(", "),
    })),
  );
  styleTableSheet(sheet);
}

function addMealItemsSheet(workbook: ExcelJS.Workbook, data: PatientReportExportData) {
  const sheet = workbook.addWorksheet("Itens_registrados");
  sheet.columns = [
    { header: "Data", key: "date", width: 14 },
    { header: "Refeicao", key: "meal", width: 20 },
    { header: "Status", key: "status", width: 18 },
    { header: "Item", key: "item", width: 34 },
    { header: "Categoria", key: "category", width: 18 },
    { header: "Porcao servida", key: "portion", width: 14 },
    { header: "% consumido", key: "percent", width: 14 },
    { header: "kcal servida", key: "servedKcal", width: 14 },
    { header: "kcal ingerida", key: "consumedKcal", width: 14 },
    { header: "CHO ingerido (g)", key: "consumedCarbs", width: 16 },
    { header: "PTN ingerida (g)", key: "consumedProtein", width: 16 },
    { header: "LIP ingerido (g)", key: "consumedFat", width: 16 },
    { header: "Na ingerido (mg)", key: "consumedSodium", width: 16 },
    { header: "Revisado", key: "reviewed", width: 12 },
    { header: "Criado por", key: "createdBy", width: 22 },
    { header: "Revisado por", key: "reviewedBy", width: 22 },
    { header: "Observacoes", key: "notes", width: 44 },
  ];
  sheet.addRows(
    data.meals.flatMap((meal) =>
      meal.items.map((item) => ({
        date: formatDate(data.date),
        meal: meal.mealType,
        status: meal.status,
        item: item.foodName,
        category: item.category,
        portion: item.servedPortionMultiplier,
        percent: item.consumedPercent,
        servedKcal: item.servedKcal,
        consumedKcal: item.consumedKcal,
        consumedCarbs: item.consumedCarbs,
        consumedProtein: item.consumedProtein,
        consumedFat: item.consumedFat,
        consumedSodium: item.consumedSodium,
        reviewed: item.manuallyReviewed ? "Sim" : "Nao",
        createdBy: meal.createdByName,
        reviewedBy: meal.reviewedByName ?? "-",
        notes: item.notes ?? meal.notes ?? "",
      })),
    ),
  );
  styleTableSheet(sheet);
}

function addMetadataSheet(workbook: ExcelJS.Workbook, data: PatientReportExportData) {
  const sheet = workbook.addWorksheet("Metadados");
  sheet.columns = [{ width: 28 }, { width: 86 }];
  sheet.addRows([
    ["Escopo", "Exportacao local do MVP demonstravel NutriTMO."],
    ["Privacidade", "Nao enviar para Google Sheets por padrao. Usar apenas dados ficticios/pseudonimizados neste MVP."],
    ["Auditoria", "O download deve gerar AuditLog com acao EXPORT no aplicativo."],
    ["Calculo", "Refeicoes canceladas nao entram no relatorio nutricional; permanecem na aba de itens com status cancelado quando existirem."],
    ["Unidades", "Energia em kcal; carboidrato, proteina e lipidios em gramas."],
    ["Data de referencia", formatDate(data.date)],
    ["Admissao", data.admissionId],
  ]);
  sheet.eachRow((row) => {
    row.getCell(1).font = { bold: true };
    row.alignment = { wrapText: true, vertical: "top" };
  });
}

function styleTableSheet(sheet: ExcelJS.Worksheet) {
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: sheet.columnCount },
  };
  const header = sheet.getRow(1);
  header.font = { bold: true, color: { argb: "FFFFFFFF" } };
  header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF166534" } };
  header.alignment = { vertical: "middle", wrapText: true };
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    row.alignment = { vertical: "top", wrapText: true };
  });
}
