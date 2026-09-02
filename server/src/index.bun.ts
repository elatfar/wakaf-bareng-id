import { Hono } from "hono";
import { cors } from "hono/cors";
import { eq, and } from "drizzle-orm";
import authRoutes from "./routes/auth";
import donaturRoutes from "./routes/donatur";
import programRoutes from "./routes/program";
import penggunaRoutes from "./routes/pengguna";
import penandatanganRoutes from "./routes/penandatangan";
import transaksiRoutes from "./routes/transaksi";
import sertifikatRoutes from "./routes/sertifikat";
import templateRoutes from "./routes/template";
import { authMiddleware } from "./middleware/auth";
import { getDb } from "./db/client";
import { transaksi, templateSertifikat, sertifikat } from "./db/schema";
import { renderSertifikatPDF } from "./lib/pdf";
import type { RenderData } from "./lib/pdf";
import type { TemplateSertifikat as TemplateSertifikatType } from "shared";

// Bun dev server
export const app = new Hono();

app.use("*", cors({ origin: "*", credentials: true }));

// Health check
app.get("/", (c) => c.json({ success: true, message: "Wakaf Bareng API" }));

// ─── PUBLIC: Cetak PDF sertifikat — no auth, purely read+render ──────────────
// Route is /api/cetak/:transaksiId — completely outside /api/sertifikat/* middleware
app.get("/api/cetak/:transaksiId", async (c) => {
  const transaksiId = Number(c.req.param("transaksiId"));
  if (isNaN(transaksiId)) {
    return c.json({ success: false, message: "ID tidak valid" }, 400);
  }

  const db = getDb();
  const baseUrl = new URL(c.req.url).origin;

  // 1. Read transaksi + donatur + program — read-only
  const trx = await db.query.transaksi.findFirst({
    where: eq(transaksi.id, transaksiId),
    with: { donatur: true, program: true },
  });

  if (!trx)
    return c.json(
      { success: false, message: "Transaksi tidak ditemukan" },
      404,
    );
  if (trx.status !== "terverifikasi") {
    return c.json(
      {
        success: false,
        message: `Transaksi berstatus '${trx.status}'. Hanya transaksi terverifikasi yang bisa dicetak.`,
      },
      400,
    );
  }
  if (!trx.donatur || !trx.program) {
    return c.json(
      { success: false, message: "Data donatur/program tidak lengkap" },
      500,
    );
  }

  // 2. Read active template matching tipe transaksi — read-only
  const template = await db.query.templateSertifikat.findFirst({
    where: and(
      eq(templateSertifikat.aktif, true),
      eq(templateSertifikat.tipe, trx.tipe),
    ),
  });
  if (!template) {
    return c.json(
      {
        success: false,
        message: `Template ${trx.tipe} belum diatur. Aktifkan template dengan tipe '${trx.tipe}' terlebih dahulu.`,
      },
      400,
    );
  }

  // 3. Derive noSertifikat from existing sertifikat record or format according to tipe
  const existingSertifikat = await db.query.sertifikat.findFirst({
    where: eq(sertifikat.transaksiId, trx.id),
  });
  const defaultCertPrefix = trx.tipe === "zakat" ? "CERT-ZKT" : "CERT-WKF";
  const noSertifikat =
    existingSertifikat?.noSertifikat ??
    trx.noTransaksi
      .replace(/^TRX-WKF\//, "CERT-WKF/")
      .replace(/^TRX-ZKT\//, "CERT-ZKT/")
      .replace(/^TRX\//, `${defaultCertPrefix}/`);
  const tanggalTerbit = trx.tanggal;

  const renderData: RenderData = {
    noTransaksi: trx.noTransaksi,
    noSertifikat,
    namaDonatur: trx.donatur.nama,
    alamatDonatur: trx.donatur.alamat ?? "",
    namaProgram: trx.program.namaProgram,
    nominalAngka: `${Number(trx.jumlah).toLocaleString("id-ID")}`,
    jenis: trx.jenis,
    jumlahTerbilang: trx.jumlahTerbilang,
    tanggalTerbit,
  };

  // 4. Fetch background via HTTP + generate PDF bytes in memory — zero disk I/O
  try {
    const pdfBytes = await renderSertifikatPDF(
      renderData,
      template as TemplateSertifikatType,
      baseUrl,
    );
    const filename = `${noSertifikat.replace(/\//g, "-")}.pdf`;

    return new Response(pdfBytes, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("PDF generation error:", err);
    const message = err instanceof Error ? err.message : "Gagal membuat PDF";
    return c.json({ success: false, message }, 500);
  }
});

// API routes
app.get("/api", (c) => c.json({ success: true, message: "Wakaf Bareng API" }));

// Public: auth
app.route("/api/auth", authRoutes);

// Protected routes — auth required
app.use("/api/donatur/*", authMiddleware);
app.use("/api/program/*", authMiddleware);
app.use("/api/pengguna/*", authMiddleware);
app.use("/api/penandatangan/*", authMiddleware);
app.use("/api/transaksi/*", authMiddleware);
app.use("/api/sertifikat/*", authMiddleware);
app.use("/api/template/*", authMiddleware);

app.route("/api/donatur", donaturRoutes);
app.route("/api/program", programRoutes);
app.route("/api/pengguna", penggunaRoutes);
app.route("/api/penandatangan", penandatanganRoutes);
app.route("/api/transaksi", transaksiRoutes);
app.route("/api/sertifikat", sertifikatRoutes);
app.route("/api/template", templateRoutes);

// Bun serve
export default {
  port: 3000,
  fetch: app.fetch,
};
