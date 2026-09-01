import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import type { TemplateSertifikat, LayoutFieldItem } from "shared";

export interface RenderData {
  noTransaksi: string;
  noSertifikat: string;
  namaDonatur: string;
  alamatDonatur?: string;
  alamat?: string;
  namaProgram: string;
  program?: string;
  nominalAngka?: string;
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
 * Render sertifikat PDF entirely in-memory using only Web APIs (fetch, no fs/path).
 * Compatible with Bun, Node.js, and Cloudflare Workers.
 *
 * @param data        - Data fields to render onto the certificate
 * @param template    - Template containing fileBackground URL and layoutField
 * @param baseUrl     - Base URL used to resolve relative fileBackground paths (e.g. "https://example.com")
 * @returns           - Raw PDF bytes as Uint8Array
 */
export async function renderSertifikatPDF(
  data: RenderData,
  template: TemplateSertifikat,
  baseUrl = ""
): Promise<Uint8Array> {
  const { layoutField } = template;
  const { canvasWidth, canvasHeight } = layoutField;

  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);
  const page = pdfDoc.addPage([canvasWidth, canvasHeight]);

  // Resolve background URL — supports absolute HTTPS and relative paths
  const bgUrl = template.fileBackground.startsWith("http")
    ? template.fileBackground
    : `${baseUrl}/${template.fileBackground.replace(/^\//, "")}`;

  const bgRes = await fetch(bgUrl);
  if (!bgRes.ok) {
    throw new Error(`Gagal mengambil background: ${bgUrl} (${bgRes.status})`);
  }
  const bgBytes = new Uint8Array(await bgRes.arrayBuffer());

  // Auto-detect PNG vs JPG based on magic bytes
  const isPng = bgBytes[0] === 0x89 && bgBytes[1] === 0x50;
  const bgImage = isPng
    ? await pdfDoc.embedPng(bgBytes)
    : await pdfDoc.embedJpg(bgBytes);

  page.drawImage(bgImage, { x: 0, y: 0, width: canvasWidth, height: canvasHeight });

  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  function drawField(text: string, field: LayoutFieldItem): void {
    if (!text) return;
    const font = field.bold ? fontBold : fontRegular;
    const fontSize = field.size;
    const textWidth = font.widthOfTextAtSize(text, fontSize);
    const yPdf = canvasHeight - field.y;
    let xDraw: number;
    if (field.align === "center") xDraw = centerX(textWidth, field.x);
    else if (field.align === "right") xDraw = rightAlignX(textWidth, field.x);
    else xDraw = field.x;
    page.drawText(text, { x: xDraw, y: yPdf, size: fontSize, font, color: rgb(0.05, 0.05, 0.05) });
  }

  const jenisLabel = data.jenis === "uang" ? "Uang" : "Barang";

  if (layoutField.namaDonatur && data.namaDonatur) {
    drawField(data.namaDonatur.toUpperCase(), layoutField.namaDonatur);
  }

  const alamatField = layoutField.alamatDonatur || layoutField.alamat;
  const alamatVal = data.alamatDonatur || data.alamat;
  if (alamatField && alamatVal) {
    drawField(alamatVal, alamatField);
  }

  const programField = layoutField.namaProgram || layoutField.program;
  const programVal = data.namaProgram || data.program;
  if (programField && programVal) {
    drawField(programVal, programField);
  }

  if (layoutField.nominalAngka && data.nominalAngka) {
    drawField(data.nominalAngka, layoutField.nominalAngka);
  }

  if (layoutField.deskripsiWakaf) {
    drawField(`${data.namaProgram} berupa ${jenisLabel}`, layoutField.deskripsiWakaf);
  }

  if (layoutField.jumlahTerbilang && data.jumlahTerbilang) {
    drawField(data.jumlahTerbilang, layoutField.jumlahTerbilang);
  }

  if (layoutField.noSertifikat && data.noSertifikat) {
    drawField(`No: ${data.noSertifikat}`, layoutField.noSertifikat);
  }

  if (layoutField.tanggalTerbit && data.tanggalTerbit) {
    drawField(formatTanggalIndo(data.tanggalTerbit), layoutField.tanggalTerbit);
  }

  return pdfDoc.save();
}
