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

// Cloudflare Workers environment bindings
export type Env = {
  DATABASE_URL: string;
  JWT_SECRET: string;
};

// Main app
export const app = new Hono<{ Bindings: Env }>();

// Global error handler to catch any unhandled exceptions and prevent Worker 1101 crashes
app.onError((err, c) => {
  console.error("Worker unhandled error:", err);
  const message = err instanceof Error ? err.message : "Internal Server Error";
  return c.json({ success: false, message }, 500);
});

// CORS - configured for single-origin deployment
app.use(
  "*",
  cors({
    origin: "*", // Allow all origins for development, can be restricted in production
    credentials: true,
  }),
);

// Initialize DB using Cloudflare secret on first request.
// getDb() is a lazy singleton — subsequent calls return the cached instance.
app.use("*", async (c, next) => {
  if (c.env?.DATABASE_URL) {
    getDb(c.env.DATABASE_URL);
  }
  await next();
});

// Health check
app.get("/", (c) => c.json({ success: true, message: "Wakaf Bareng API" }));

// ─── PUBLIC: PDF sertifikat — no auth, purely read+render, no DB writes ───────
// Access via: /api/cetak/:transaksiId
// Completely outside /api/sertifikat/* so authMiddleware never runs here.
app.get("/api/cetak/:transaksiId", async (c) => {
  try {
    const transaksiId = Number(c.req.param("transaksiId"));
    if (isNaN(transaksiId)) {
      return c.json({ success: false, message: "ID tidak valid" }, 400);
    }

    const db = getDb(c.env?.DATABASE_URL);
    const baseUrl = new URL(c.req.url).origin;

    // 1. Read transaksi + donatur + program — read-only
    const trx = await db.query.transaksi.findFirst({
      where: eq(transaksi.id, transaksiId),
      with: { donatur: true, program: true },
    });

    if (!trx) {
      return c.json(
        { success: false, message: "Transaksi tidak ditemukan" },
        404,
      );
    }
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
        {
          success: false,
          message: "Data donatur atau program tidak ditemukan",
        },
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

    // 4. Fetch background via link + render PDF in memory — zero disk I/O
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
    console.error("[/api/cetak] error:", err);
    const message =
      err instanceof Error ? `${err.name}: ${err.message}` : String(err);
    return c.json({ success: false, message }, 500);
  }
});

// API routes with /api prefix
// Health check for API
app.get("/api", (c) => c.json({ success: true, message: "Wakaf Bareng API" }));

// Public routes (no auth required)
app.route("/api/auth", authRoutes);

// Protected routes (auth required for all)
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

export default app;
