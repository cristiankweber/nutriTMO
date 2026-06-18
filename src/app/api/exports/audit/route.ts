import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { writeAuditLog } from "@/lib/audit";
import { canViewAudit } from "@/lib/auth/permissions";
import { getSessionUser } from "@/lib/auth/session";
import { auditReportFilename, buildAuditReportPdf, buildAuditReportXlsx, getAuditExportData } from "@/lib/exports/auditReport";
import { createDownloadResponse, parseExportFormat } from "@/lib/exports/shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
  if (!canViewAudit(user.role)) return NextResponse.json({ error: "Perfil sem permissao para auditoria." }, { status: 403 });

  const format = parseExportFormat(request.nextUrl.searchParams.get("format"));
  if (!format) return NextResponse.json({ error: "Formato invalido. Use xlsx ou pdf." }, { status: 400 });

  const requestedLimit = Number(request.nextUrl.searchParams.get("limit") ?? 100);
  const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(Math.trunc(requestedLimit), 1), 500) : 100;
  const data = await getAuditExportData(limit);
  const buffer = format === "xlsx" ? await buildAuditReportXlsx(data) : await buildAuditReportPdf(data);
  const filename = auditReportFilename(data, format);

  await writeAuditLog({
    userId: user.id,
    entityType: "AuditLogExport",
    entityId: "audit",
    action: "EXPORT",
    afterJson: {
      format,
      filename,
      exportedLogs: data.logs.length,
      limit,
    },
  });

  return createDownloadResponse(buffer, filename, format);
}
