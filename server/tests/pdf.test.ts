import { afterEach, expect, test } from "bun:test";
import { PDFDocument, PDFName, PDFRawStream } from "pdf-lib";
import { inflateSync } from "node:zlib";
import { renderSertifikatPDF, type RenderData } from "../src/lib/pdf";
import type { TemplateSertifikat } from "shared";

const originalFetch = globalThis.fetch;
const originalNow = Date.now;
afterEach(() => { globalThis.fetch = originalFetch; Date.now = originalNow; });
const png = await Bun.file(new URL("../../storage/backgrounds/BG-Sertifikat.png", import.meta.url)).bytes();
const template = (url: string): TemplateSertifikat => ({
  id: 1, namaTemplate: "Test", tipe: "wakaf", aktif: true,
  fileBackground: url, penandatangan1Id: null, penandatangan2Id: null,
  layoutField: { canvasWidth: 842, canvasHeight: 595,
    namaDonatur: { x: 421, y: 250, size: 20, align: "center", bold: true } },
});
const data: RenderData = { noTransaksi: "TRX/1", noSertifikat: "CERT/1",
  namaDonatur: "ALICE", namaProgram: "Program", jenis: "uang",
  jumlahTerbilang: "Seribu rupiah", tanggalTerbit: "2026-09-13" };

async function pageText(bytes: Uint8Array) {
  const doc = await PDFDocument.load(bytes);
  expect(doc.getPageCount()).toBe(1);
  expect(doc.getPages()[0]!.getSize()).toEqual({ width: 842, height: 595 });
  return doc.context.enumerateIndirectObjects().flatMap(([, object]) => {
    if (!(object instanceof PDFRawStream) || object.dict.get(PDFName.of("Subtype")) === PDFName.of("Image")) return [];
    try { return [inflateSync(object.getContents()).toString()]; } catch { return []; }
  }).join("\n");
}

test("reuses prepared background without leaking donor text across downloads", async () => {
  let calls = 0;
  globalThis.fetch = (async () => { calls++; return new Response(png); }) as typeof fetch;
  const first = await renderSertifikatPDF(data, template("https://test.invalid/cache.png"));
  const second = await renderSertifikatPDF({ ...data, namaDonatur: "BOB" }, template("https://test.invalid/cache.png"));
  expect(calls).toBe(1);
  expect(await pageText(first)).toContain(Buffer.from("ALICE").toString("hex").toUpperCase());
  const text = await pageText(second);
  expect(text).toContain(Buffer.from("BOB").toString("hex").toUpperCase());
  expect(text).not.toContain(Buffer.from("ALICE").toString("hex").toUpperCase());
});

test("rejects oversized streamed bodies even without Content-Length", async () => {
  let cancelled = false;
  globalThis.fetch = (async () => new Response(new ReadableStream({
    pull(controller) { controller.enqueue(new Uint8Array(1024 * 1024)); },
    cancel() { cancelled = true; },
  }))) as typeof fetch;
  await expect(renderSertifikatPDF(data, template("https://test.invalid/large.png"))).rejects.toThrow("5MB");
  expect(cancelled).toBe(true);
});

test("rejects PNG decompression risk before embedding", async () => {
  const huge = png.slice();
  const header = new DataView(huge.buffer);
  header.setUint32(16, 10000); header.setUint32(20, 10000);
  globalThis.fetch = (async () => new Response(huge)) as typeof fetch;
  await expect(renderSertifikatPDF(data, template("https://test.invalid/pixels.png"))).rejects.toThrow("megapiksel");
});

test("rejects oversized base64 without decoding it", async () => {
  await expect(renderSertifikatPDF(data, template(`data:image/png;base64,${"A".repeat(7 * 1024 * 1024)}`))).rejects.toThrow("5MB");
});

test("does not cache failed fetches", async () => {
  let calls = 0;
  globalThis.fetch = (async () => { calls++; return new Response("failure", { status: 503 }); }) as typeof fetch;
  for (let i = 0; i < 2; i++) {
    await expect(renderSertifikatPDF(data, template("https://test.invalid/failure.png"))).rejects.toThrow("link langsung");
  }
  expect(calls).toBe(2);
});

test("refreshes background after TTL and separates canvas dimensions", async () => {
  let now = originalNow();
  Date.now = () => now;
  let calls = 0;
  globalThis.fetch = (async () => { calls++; return new Response(png); }) as typeof fetch;
  const input = template("https://test.invalid/expiry.png");
  await renderSertifikatPDF(data, input);
  await renderSertifikatPDF(data, input);
  expect(calls).toBe(1);
  now += 60_001;
  await renderSertifikatPDF(data, input);
  expect(calls).toBe(2);
  const resized = await renderSertifikatPDF(data, { ...input,
    layoutField: { ...input.layoutField, canvasWidth: 1000 },
  });
  expect(calls).toBe(3);
  expect((await PDFDocument.load(resized)).getPages()[0]!.getWidth()).toBe(1000);
});
