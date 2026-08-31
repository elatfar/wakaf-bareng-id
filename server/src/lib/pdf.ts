import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import * as fs from "fs";
import * as path from "path";
import type { TemplateSertifikat, LayoutFieldItem } from "shared";

// NOTE: SERVER_ROOT is computed lazily inside renderSertifikatPDF()
// because import.meta.dir is a Bun-only API (undefined in Cloudflare Workers)
// and must NOT be evaluated at module load time.

export interface RenderData {
  noTransaksi: string;
  noSertifikat: string;
  namaDonatur: string;
  namaProgram: string;
  jenis: "uang" | "barang";
  jumlahTerbilang: string;
  tanggalTerbit: string; // ISO date string e.g. "2026-08-29"
}

const BULAN = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

/** Format ISO date string to Indonesian date format, e.g. "29 Agustus 2026" */
export function formatTanggalIndo(iso: string): string {
  const d = new Date(iso);
  const day = d.getUTCDate();
  const month = BULAN[d.getUTCMonth()];
  const year = d.getUTCFullYear();
  return `${day} ${month} ${year}`;
}

/** x position for center-aligned text: x_draw + textWidth/2 === xCenter */
export function centerX(textWidth: number, xCenter: number): number {
  return xCenter - textWidth / 2;
}

/** x position for right-aligned text: x_draw + textWidth === xRight */
export function rightAlignX(textWidth: number, xRight: number): number {
  return xRight - textWidth;
}

export async function renderSertifikatPDF(
  data: RenderData,
  template: TemplateSertifikat
): Promise<string> {
  // Compute server root lazily — import.meta.dir is Bun-only and must not
  // be used at module load time (Cloudflare Workers does not support it).
  const serverRoot = path.resolve(import.meta.dir, "../..");

  const { layoutField } = template;
  const { canvasWidth, canvasHeight } = layoutField;

  // Create PDF document
  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);

  // Set page size to canvas dimensions (points = pixels at 72dpi)
  const page = pdfDoc.addPage([canvasWidth, canvasHeight]);

  // Embed background PNG
  const bgPath = path.resolve(serverRoot, template.fileBackground);
  const bgBytes = fs.readFileSync(bgPath);
  const bgImage = await pdfDoc.embedPng(bgBytes);
  page.drawImage(bgImage, {
    x: 0,
    y: 0,
    width: canvasWidth,
    height: canvasHeight,
  });

  // Use built-in Helvetica fonts
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Helper to draw a single layout field
  function drawField(text: string, field: LayoutFieldItem): void {
    const font = field.bold ? fontBold : fontRegular;
    const fontSize = field.size;
    const textWidth = font.widthOfTextAtSize(text, fontSize);

    // y-flip: pdf-lib origin is bottom-left, layout origin is top-left
    const yPdf = canvasHeight - field.y;

    let xDraw: number;
    if (field.align === "center") {
      xDraw = centerX(textWidth, field.x);
    } else if (field.align === "right") {
      xDraw = rightAlignX(textWidth, field.x);
    } else {
      // left align
      xDraw = field.x;
    }

    page.drawText(text, {
      x: xDraw,
      y: yPdf,
      size: fontSize,
      font,
      color: rgb(0.05, 0.05, 0.05),
    });
  }

  // Build deskripsiWakaf text
  const jenisLabel = data.jenis === "uang" ? "Uang" : "Barang";
  const deskripsiWakaf = `${data.namaProgram} berupa ${jenisLabel}`;

  // Draw all 5 dynamic fields
  drawField(data.namaDonatur.toUpperCase(), layoutField.namaDonatur);
  drawField(deskripsiWakaf, layoutField.deskripsiWakaf);
  drawField(data.jumlahTerbilang, layoutField.jumlahTerbilang);
  drawField(`No: ${data.noSertifikat}`, layoutField.noSertifikat);
  drawField(formatTanggalIndo(data.tanggalTerbit), layoutField.tanggalTerbit);

  // Serialize PDF
  const pdfBytes = await pdfDoc.save();

  // Ensure output directory exists
  const outDir = path.resolve(serverRoot, "storage", "sertifikat");
  fs.mkdirSync(outDir, { recursive: true });

  const filePath = path.join(outDir, `${data.noTransaksi.replace(/\//g, "-")}.pdf`);
  fs.writeFileSync(filePath, pdfBytes);

  return filePath;
}
