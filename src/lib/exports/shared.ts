import { NextResponse } from "next/server";
import { parseDateInputValue } from "@/lib/dates";

export type ExportFormat = "xlsx" | "pdf";

export const parseExportFormat = (value: string | null): ExportFormat | null => {
  if (value === "xlsx" || value === "pdf") return value;
  return null;
};

export const normalizeDateParam = (value: string | null) => {
  return parseDateInputValue(value);
};

export const safeFileSegment = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();

export const contentTypeByFormat: Record<ExportFormat, string> = {
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  pdf: "application/pdf",
};

export const createDownloadResponse = (buffer: Buffer, filename: string, format: ExportFormat) =>
  new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": contentTypeByFormat[format],
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
