import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
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

// Cache only background PDFs, never donor data or mutable PDFDocument instances.
// The byte budget is shared across all entries in this isolate.
const backgrounds = new Map<string, { bytes: Uint8Array; expires: number }>();
const CACHE_BYTES = 8 * 1024 * 1024;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

async function readBackground(url: string): Promise<Uint8Array> {
  if (url.startsWith("data:")) {
    const comma = url.indexOf(",");
    if (comma < 0 || !/^data:image\/(png|jpe?g);base64$/i.test(url.slice(0, comma))) {
      throw new Error("Data URL background harus PNG/JPG base64");
    }
    const encoded = url.slice(comma + 1);
    if (encoded.length > Math.ceil(MAX_IMAGE_BYTES / 3) * 4) {
      throw new Error("Ukuran background melebihi 5MB");
    }
    const binary = atob(encoded);
    if (binary.length > MAX_IMAGE_BYTES) throw new Error("Ukuran background melebihi 5MB");
    return Uint8Array.from(binary, c => c.charCodeAt(0));
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok || response.headers.get("content-type")?.includes("text/html")) {
      await response.body?.cancel();
      throw new Error("Background harus berupa link langsung ke gambar PNG/JPG yang dapat diakses");
    }
    if (Number(response.headers.get("content-length")) > MAX_IMAGE_BYTES) {
      await response.body?.cancel();
      throw new Error("Ukuran background melebihi 5MB");
    }
    const reader = response.body?.getReader();
    if (!reader) throw new Error("File background kosong");
    const chunks: Uint8Array[] = [];
    let length = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        length += value.byteLength;
        if (length > MAX_IMAGE_BYTES) {
          await reader.cancel();
          throw new Error("Ukuran background melebihi 5MB");
        }
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }
    const bytes = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    return bytes;
  } finally {
    // Keep the timeout active until the body has finished, not just the headers.
    clearTimeout(timer);
  }
}

async function backgroundDocument(url: string, width: number, height: number): Promise<PDFDocument> {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw new Error("Ukuran canvas tidak valid");
  }
  if (url.startsWith("data:") && url.length > Math.ceil(MAX_IMAGE_BYTES / 3) * 4 + 64) {
    throw new Error("Ukuran background melebihi 5MB");
  }
  // Hash also keeps multi-megabyte data URLs out of cache keys.
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(url));
  const key = `${width}:${height}:${Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, "0")).join("")}`;
  const now = Date.now();
  for (const [id, entry] of backgrounds) if (entry.expires <= now) backgrounds.delete(id);
  const cached = backgrounds.get(key);
  if (cached) return PDFDocument.load(cached.bytes);

  const bytes = await readBackground(url);
  const doc = await PDFDocument.create();
  const page = doc.addPage([width, height]);
  const isPng = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  const isJpg = bytes[0] === 0xff && bytes[1] === 0xd8;
  if (!isPng && !isJpg) throw new Error("Format background harus PNG atau JPG");
  if (isPng) {
    if (bytes.length < 24) throw new Error("PNG tidak valid");
    const header = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const pixels = header.getUint32(16) * header.getUint32(20);
    // PNG decoding allocates several raw pixel buffers even for small files.
    if (!pixels || pixels > 4_000_000) {
      throw new Error("Background PNG maksimal 4 megapiksel. Perkecil gambar atau gunakan JPG.");
    }
  }
  const image = isPng ? await doc.embedPng(bytes) : await doc.embedJpg(bytes);
  page.drawImage(image, { x: 0, y: 0, width, height });
  const prepared = await doc.save({ useObjectStreams: false });
  if (prepared.byteLength <= CACHE_BYTES) {
    let used = [...backgrounds.values()].reduce((sum, entry) => sum + entry.bytes.byteLength, 0);
    for (const [id, entry] of backgrounds) {
      if (used + prepared.byteLength <= CACHE_BYTES && backgrounds.size < 4) break;
      backgrounds.delete(id);
      used -= entry.bytes.byteLength;
    }
    backgrounds.set(key, { bytes: prepared, expires: Date.now() + 60_000 });
  }
  // Reload after serialization so subsequent text uses a fresh content stream.
  return PDFDocument.load(prepared);
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

  const pdfDoc = await backgroundDocument(bgUrl, canvasWidth, canvasHeight);
  const page = pdfDoc.getPages()[0]!;
  const [fontRegular, fontBold] = await Promise.all([
    pdfDoc.embedFont(StandardFonts.Helvetica),
    pdfDoc.embedFont(StandardFonts.HelveticaBold),
  ]);

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

  return pdfDoc.save({ useObjectStreams: false });
}
