import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import * as fs from "fs";
import * as path from "path";
import type { TemplateSertifikat, LayoutFieldItem } from "shared";

export interface RenderData {
  noTransaksi: string;
  noSertifikat: string;
  namaDonatur: string;
  namaProgram: string;
  jenis: "uang" | "barang";
  jumlahTerbilang: string;
  tanggalTerbit: string;
}

const BULAN = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

export function formatTanggalIndo(iso: string): string {
  const d = new Date(iso);
  const day = d.getUTCDate();
  const month = BULAN[d.getUTCMonth()];
  const year = d.getUTCFullYear();
  return `${day} ${month} ${year}`;
}

export function centerX(textWidth: number, xCenter: number): number {
  return xCenter - textWidth / 2;
}

export function rightAlignX(textWidth: number, xRight: number): number {
  return xRight - textWidth;
}

/**
 * Render sertifikat PDF entirely in-memory.
 * Returns raw PDF bytes — nothing is written to disk.
 */
export async function renderSertifikatPDF(
  data: RenderData,
  template: TemplateSertifikat
): Promise<Uint8Array> {
  const serverRoot = path.resolve(import.meta.dir, "../..");
  const { layoutField } = template;
  const { canvasWidth, canvasHeight } = layoutField;

  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);
  const page = pdfDoc.addPage([canvasWidth, canvasHeight]);

  // Background image — read from disk, embedded into PDF bytes
  const bgPath = path.resolve(serverRoot, template.fileBackground);
  const bgBytes = fs.readFileSync(bgPath);
  const bgImage = await pdfDoc.embedPng(bgBytes);
  page.drawImage(bgImage, { x: 0, y: 0, width: canvasWidth, height: canvasHeight });

  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  function drawField(text: string, field: LayoutFieldItem): void {
    const font = field.bold ? fontBold : fontRegular;
    const fontSize = field.size;
    const textWidth = font.widthOfTextAtSize(text, fontSize);
    const yPdf = canvasHeight - field.y;
    let xDraw: number;
    if (field.align === "center") {
      xDraw = centerX(textWidth, field.x);
    } else if (field.align === "right") {
      xDraw = rightAlignX(textWidth, field.x);
    } else {
      xDraw = field.x;
    }
    page.drawText(text, { x: xDraw, y: yPdf, size: fontSize, font, color: rgb(0.05, 0.05, 0.05) });
  }

  const jenisLabel = data.jenis === "uang" ? "Uang" : "Barang";
  drawField(data.namaDonatur.toUpperCase(), layoutField.namaDonatur);
  drawField(`${data.namaProgram} berupa ${jenisLabel}`, layoutField.deskripsiWakaf);
  drawField(data.jumlahTerbilang, layoutField.jumlahTerbilang);
  drawField(`No: ${data.noSertifikat}`, layoutField.noSertifikat);
  drawField(formatTanggalIndo(data.tanggalTerbit), layoutField.tanggalTerbit);

  // Return raw bytes — caller streams directly to client
  return pdfDoc.save();
}
