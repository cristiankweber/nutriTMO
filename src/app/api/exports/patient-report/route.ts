import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { writeAuditLog } from "@/lib/audit";
import { canExportPatientReports } from "@/lib/auth/permissions";
import { getSessionUser } from "@/lib/auth/session";
import { startOfLocalDay, toDateInputValue } from "@/lib/dates";
import {
  buildPatientReportPdf,
  buildPatientReportXlsx,
  getPatientReportExportData,
  patientReportFilename,
} from "@/lib/exports/patientReport";
import { createDownloadResponse, normalizeDateParam, parseExportFormat } from "@/lib/exports/shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
  if (!canExportPatientReports(user.role)) return NextResponse.json({ error: "Perfil sem permissao para exportar relatorio clinico." }, { status: 403 });

  const admissionId = request.nextUrl.searchParams.get("admissionId");
  if (!admissionId) return NextResponse.json({ error: "admissionId obrigatorio." }, { status: 400 });

  const format = parseExportFormat(request.nextUrl.searchParams.get("format"));
  if (!format) return NextResponse.json({ error: "Formato invalido. Use xlsx ou pdf." }, { status: 400 });

  const date = normalizeDateParam(request.nextUrl.searchParams.get("date")) ?? startOfLocalDay();
  const data = await getPatientReportExportData(admissionId, date);
  if (!data) return NextResponse.json({ error: "Admissao nao encontrada." }, { status: 404 });

  const buffer = format === "xlsx" ? await buildPatientReportXlsx(data) : await buildPatientReportPdf(data);
  const filename = patientReportFilename(data, format);

  await writeAuditLog({
    userId: user.id,
    entityType: "NutritionReport",
    entityId: data.admissionId,
    action: "EXPORT",
    afterJson: {
      format,
      filename,
      date: toDateInputValue(data.date),
      patientCode: data.patientCode,
      meals: data.meals.length,
      hasDailySummary: Boolean(data.summary),
    },
  });

  return createDownloadResponse(buffer, filename, format);
}
