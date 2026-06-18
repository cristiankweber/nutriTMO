import ExcelJS from "exceljs";
import { formatDateTime } from "@/lib/dates";
import { db } from "@/lib/db";

import { SimplePdfReport } from "./pdfReport";
import { type ExportFormat, safeFileSegment } from "./shared";

type AuditExportLog = {
  id: string;
  createdAt: Date;
  userName: string;
  action: string;
  entityType: string;
  entityId: string;
  beforeJson: string;
  afterJson: string;
};

export type AuditExportData = {
  generatedAt: Date;
  limit: number;
  logs: AuditExportLog[];
};

export async function getAuditExportData(limit = 100): Promise<AuditExportData> {
  const logs = await db.auditLog.findMany({
    include: { user: true },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return {
    generatedAt: new Date(),
    limit,
    logs: logs.map((log) => ({
      id: log.id,
      createdAt: log.createdAt,
      userName: log.user?.name ?? "Sistema",
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId,
      beforeJson: serializeJson(log.beforeJson),
      afterJson: serializeJson(log.afterJson),
    })),
  };
}

export const auditReportFilename = (data: AuditExportData, format: ExportFormat) =>
  `nutritmo-auditoria-${safeFileSegment(data.generatedAt.toISOString().slice(0, 16))}.${format}`;

export async function buildAuditReportXlsx(data: AuditExportData) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "NutriTMO";
  workbook.created = data.generatedAt;

  const sheet = workbook.addWorksheet("Auditoria");
  sheet.columns = [
    { header: "Data/hora", key: "createdAt", width: 22 },
    { header: "Usuario", key: "userName", width: 24 },
    { header: "Acao", key: "action", width: 14 },
    { header: "Entidade", key: "entityType", width: 24 },
    { header: "ID entidade", key: "entityId", width: 30 },
    { header: "Antes JSON", key: "beforeJson", width: 60 },
    { header: "Depois JSON", key: "afterJson", width: 60 },
    { header: "AuditLog ID", key: "id", width: 30 },
  ];
  sheet.addRows(
    data.logs.map((log) => ({
      createdAt: formatDateTime(log.createdAt),
      userName: log.userName,
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId,
      beforeJson: truncateForExcel(log.beforeJson),
      afterJson: truncateForExcel(log.afterJson),
      id: log.id,
    })),
  );
  styleAuditSheet(sheet);

  const metadata = workbook.addWorksheet("Metadados");
  metadata.columns = [{ width: 28 }, { width: 86 }];
  metadata.addRows([
    ["Escopo", "Exportacao local da trilha de auditoria do MVP NutriTMO."],
    ["Gerado em", formatDateTime(data.generatedAt)],
    ["Quantidade exportada", data.logs.length],
    ["Limite aplicado", data.limit],
    ["Privacidade", "Nao enviar para Google Sheets por padrao. Evitar dados reais neste MVP demonstravel."],
    ["Observacao", "Campos JSON podem ser truncados apenas se excederem o limite maximo seguro de celula XLSX."],
  ]);
  metadata.eachRow((row) => {
    row.getCell(1).font = { bold: true };
    row.alignment = { wrapText: true, vertical: "top" };
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

export async function buildAuditReportPdf(data: AuditExportData) {
  const pdf = await SimplePdfReport.create();
  pdf.title("NutriTMO - Auditoria local", `Gerado em ${formatDateTime(data.generatedAt)}. Ultimos ${data.logs.length} eventos.`);
  pdf.section("Resumo");
  pdf.keyValue("Eventos exportados", data.logs.length);
  pdf.keyValue("Limite aplicado", data.limit);
  pdf.paragraph("Este PDF resume a trilha de auditoria para leitura. Use o XLSX para revisao tabular com campos JSON em colunas dedicadas.");

  pdf.section("Eventos");
  for (const log of data.logs) {
    pdf.keyValue("Data/hora", formatDateTime(log.createdAt));
    pdf.keyValue("Usuario", log.userName);
    pdf.keyValue("Evento", `${log.action} - ${log.entityType} - ${log.entityId}`);
    if (log.beforeJson) pdf.paragraph(`Antes JSON: ${truncateForPdf(log.beforeJson)}`, { size: 8, spacingAfter: 2 });
    if (log.afterJson) pdf.paragraph(`Depois JSON: ${truncateForPdf(log.afterJson)}`, { size: 8, spacingAfter: 8 });
  }

  return pdf.save();
}

function serializeJson(value: unknown) {
  if (value === null || value === undefined) return "";
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function truncateForExcel(value: string) {
  const limit = 32_000;
  return value.length > limit ? `${value.slice(0, limit)}\n[truncado no limite seguro de celula XLSX]` : value;
}

function truncateForPdf(value: string) {
  const compact = value.replace(/\s+/g, " ").trim();
  return compact.length > 900 ? `${compact.slice(0, 900)}... [trecho truncado no PDF]` : compact;
}

function styleAuditSheet(sheet: ExcelJS.Worksheet) {
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: sheet.columnCount },
  };
  const header = sheet.getRow(1);
  header.font = { bold: true, color: { argb: "FFFFFFFF" } };
  header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1C1917" } };
  header.alignment = { vertical: "middle", wrapText: true };
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    row.alignment = { vertical: "top", wrapText: true };
  });
}
