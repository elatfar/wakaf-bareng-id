import { PDFDocument, rgb, StandardFonts, PDFDocument as PDFDocType } from "pdf-lib";
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

// Optimasi: Cache font instance untuk mengurangi CPU usage
let cachedPdfDoc: PDFDocType | null = null;
let cachedFontRegular: any = null;
let cachedFontBold: any = null;

async function getFonts(pdfDoc: PDFDocType) {
  if (cachedFontRegular && cachedFontBold && cachedPdfDoc === pdfDoc) {
    return { fontRegular: cachedFontRegular, fontBold: cachedFontBold };
  }

  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Cache fonts for reuse
  cachedFontRegular = fontRegular;
  cachedFontBold = fontBold;
  cachedPdfDoc = pdfDoc;

  return { fontRegular, fontBold };
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

  if (!template.fileBackground || typeof template.fileBackground !== "string" || !template.fileBackground.trim()) {
    throw new Error("File background template tidak ditemukan atau kosong");
  }

  // Resolve background URL — supports absolute HTTPS / HTTP or relative URL
  let bgUrl = template.fileBackground.trim();
  if (!bgUrl.startsWith("http://") && !bgUrl.startsWith("https://") && !bgUrl.startsWith("data:")) {
    if (!baseUrl) {
      throw new Error(`URL background '${bgUrl}' tidak valid. Gunakan link gambar http(s) yang lengkap.`);
    }
    bgUrl = `${baseUrl.replace(/\/+$/, "")}/${bgUrl.replace(/^\/+/, "")}`;
  }

  let bgBytes: Uint8Array;
  if (bgUrl.startsWith("data:")) {
    // Support base64 data URLs
    const base64Parts = bgUrl.split(",");
    const base64Data = base64Parts[1];
    if (!base64Data) {
      throw new Error("Data URL background tidak valid");
    }
    const binaryStr = atob(base64Data);
    bgBytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bgBytes[i] = binaryStr.charCodeAt(i);
    }
  } else {
    // Fetch via HTTP with timeout to prevent worker execution hang
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000); // 5s timeout (reduced from 10s)
    let bgRes: Response;
    try {
      bgRes = await fetch(bgUrl, { signal: controller.signal });
    } catch (fetchErr: any) {
      clearTimeout(timeout);
      if (fetchErr.name === 'AbortError') {
        throw new Error(`Timeout saat mengambil background dari ${bgUrl}. Pastikan URL dapat diakses dengan cepat.`);
      }
      throw new Error(`Gagal mengambil background dari ${bgUrl}: ${fetchErr?.message || fetchErr}`);
    }
    clearTimeout(timeout);

    if (!bgRes.ok) {
      throw new Error(`Gagal mengambil background dari link: ${bgUrl} (HTTP ${bgRes.status} ${bgRes.statusText})`);
    }

    const contentType = (bgRes.headers.get("content-type") || "").toLowerCase();
    if (contentType.includes("text/html")) {
      throw new Error(`Link background (${bgUrl}) mengembalikan halaman HTML, bukan file gambar. Pastikan URL langsung mengarah ke file gambar PNG/JPG.`);
    }

    // Optimasi: Limit background image size to prevent memory issues
    const contentLength = bgRes.headers.get("content-length");
    if (contentLength && Number(contentLength) > 5 * 1024 * 1024) { // 5MB limit
      throw new Error(`Ukuran background terlalu besar (${(Number(contentLength) / 1024 / 1024).toFixed(2)}MB). Gunakan gambar kurang dari 5MB.`);
    }

    bgBytes = new Uint8Array(await bgRes.arrayBuffer());
  }

  if (bgBytes.length === 0) {
    throw new Error("File background kosong (0 bytes)");
  }

  // Auto-detect PNG vs JPG based on magic bytes
  const isPng = bgBytes[0] === 0x89 && bgBytes[1] === 0x50 && bgBytes[2] === 0x4e && bgBytes[3] === 0x47;
  const isJpg = bgBytes[0] === 0xff && bgBytes[1] === 0xd8;

  let bgImage;
  if (isPng) {
    bgImage = await pdfDoc.embedPng(bgBytes);
  } else if (isJpg) {
    bgImage = await pdfDoc.embedJpg(bgBytes);
  } else {
    try {
      bgImage = await pdfDoc.embedPng(bgBytes);
    } catch {
      try {
        bgImage = await pdfDoc.embedJpg(bgBytes);
      } catch {
        throw new Error("Format gambar background tidak valid. Harap gunakan format PNG atau JPG.");
      }
    }
  }

  page.drawImage(bgImage, { x: 0, y: 0, width: canvasWidth, height: canvasHeight });

  // Optimasi: Gunakan cached fonts untuk mengurangi CPU usage
  const { fontRegular, fontBold } = await getFonts(pdfDoc);

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
    drawField(`${data.noSertifikat}`, layoutField.noSertifikat);
  }

  if (layoutField.tanggalTerbit && data.tanggalTerbit) {
    drawField(formatTanggalIndo(data.tanggalTerbit), layoutField.tanggalTerbit);
  }

  return pdfDoc.save();
}
