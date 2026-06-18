import { PDFDocument, PDFPage, PDFFont, StandardFonts, rgb } from "pdf-lib";

type PdfTableColumn = {
  header: string;
  width: number;
  align?: "left" | "right";
};

const pageSize: [number, number] = [595.28, 841.89];
const margin = 42;
const textColor = rgb(0.18, 0.15, 0.12);
const mutedColor = rgb(0.44, 0.39, 0.34);
const borderColor = rgb(0.86, 0.83, 0.78);
const headerFill = rgb(0.96, 0.94, 0.9);

export const toPdfText = (value: unknown) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E\n]/g, " ")
    .replace(/[ \t]+/g, " ")
    .trim();

export class SimplePdfReport {
  private readonly doc: PDFDocument;
  private readonly regular: PDFFont;
  private readonly bold: PDFFont;
  private page!: PDFPage;
  private y = 0;

  private constructor(doc: PDFDocument, regular: PDFFont, bold: PDFFont) {
    this.doc = doc;
    this.regular = regular;
    this.bold = bold;
    this.addPage();
  }

  static async create() {
    const doc = await PDFDocument.create();
    const regular = await doc.embedFont(StandardFonts.Helvetica);
    const bold = await doc.embedFont(StandardFonts.HelveticaBold);
    return new SimplePdfReport(doc, regular, bold);
  }

  title(title: string, subtitle?: string) {
    this.drawText(toPdfText(title), { font: this.bold, size: 16 });
    if (subtitle) this.paragraph(subtitle, { size: 9, color: mutedColor, spacingAfter: 12 });
  }

  section(title: string) {
    this.ensureSpace(28);
    this.y -= 6;
    this.drawText(toPdfText(title), { font: this.bold, size: 12 });
  }

  keyValue(label: string, value: unknown) {
    this.paragraph(`${label}: ${value ?? "-"}`, { size: 9, spacingAfter: 2 });
  }

  paragraph(text: string, options: { size?: number; color?: ReturnType<typeof rgb>; spacingAfter?: number; font?: PDFFont } = {}) {
    const size = options.size ?? 10;
    const font = options.font ?? this.regular;
    const lines = this.wrapText(toPdfText(text), font, size, this.maxWidth());
    const leading = size + 4;
    this.ensureSpace(lines.length * leading + (options.spacingAfter ?? 6));
    for (const line of lines) {
      this.drawText(line, { font, size, color: options.color ?? textColor, leading });
    }
    this.y -= options.spacingAfter ?? 6;
  }

  table(columns: PdfTableColumn[], rows: string[][]) {
    const rowLeading = 11;
    const cellPadding = 5;
    const tableWidth = columns.reduce((sum, column) => sum + column.width, 0);

    this.ensureSpace(26);
    this.page.drawRectangle({
      x: margin,
      y: this.y - 17,
      width: tableWidth,
      height: 19,
      color: headerFill,
      borderColor,
      borderWidth: 0.5,
    });
    let x = margin;
    columns.forEach((column) => {
      this.page.drawText(toPdfText(column.header), {
        x: x + cellPadding,
        y: this.y - 12,
        size: 8,
        font: this.bold,
        color: mutedColor,
      });
      x += column.width;
    });
    this.y -= 24;

    for (const row of rows) {
      const wrappedCells = row.map((cell, index) => this.wrapText(toPdfText(cell), this.regular, 8, columns[index].width - cellPadding * 2));
      const rowHeight = Math.max(18, Math.max(...wrappedCells.map((cell) => cell.length)) * rowLeading + cellPadding * 2);
      this.ensureSpace(rowHeight + 4);
      this.page.drawRectangle({
        x: margin,
        y: this.y - rowHeight + 4,
        width: tableWidth,
        height: rowHeight,
        borderColor,
        borderWidth: 0.35,
      });

      x = margin;
      wrappedCells.forEach((lines, index) => {
        const column = columns[index];
        lines.forEach((line, lineIndex) => {
          const textWidth = this.regular.widthOfTextAtSize(line, 8);
          this.page.drawText(line, {
            x: column.align === "right" ? x + column.width - cellPadding - textWidth : x + cellPadding,
            y: this.y - cellPadding - 7 - lineIndex * rowLeading,
            size: 8,
            font: this.regular,
            color: textColor,
          });
        });
        x += column.width;
      });
      this.y -= rowHeight + 2;
    }
  }

  async save() {
    const bytes = await this.doc.save();
    return Buffer.from(bytes);
  }

  private addPage() {
    this.page = this.doc.addPage(pageSize);
    this.y = this.page.getHeight() - margin;
  }

  private ensureSpace(height: number) {
    if (this.y - height < margin) this.addPage();
  }

  private maxWidth() {
    return this.page.getWidth() - margin * 2;
  }

  private drawText(
    text: string,
    options: { font: PDFFont; size: number; color?: ReturnType<typeof rgb>; leading?: number },
  ) {
    this.ensureSpace(options.leading ?? options.size + 4);
    this.page.drawText(text, {
      x: margin,
      y: this.y,
      size: options.size,
      font: options.font,
      color: options.color ?? textColor,
    });
    this.y -= options.leading ?? options.size + 4;
  }

  private wrapText(text: string, font: PDFFont, size: number, maxWidth: number) {
    if (!text) return [""];
    const lines: string[] = [];
    for (const paragraph of text.split("\n")) {
      let current = "";
      for (const word of paragraph.split(/\s+/).filter(Boolean)) {
        const candidate = current ? `${current} ${word}` : word;
        if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
          current = candidate;
          continue;
        }
        if (current) lines.push(current);
        current = word;
      }
      lines.push(current);
    }
    return lines;
  }
}
