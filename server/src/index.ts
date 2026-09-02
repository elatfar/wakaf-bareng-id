import { Hono } from "hono";
import { cors } from "hono/cors";
import { eq, and, sql } from "drizzle-orm";
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
import { transaksi, templateSertifikat, sertifikat, donatur, program } from "./db/schema";
import { renderSertifikatPDF } from "./lib/pdf";
import type { RenderData } from "./lib/pdf";
import type { TemplateSertifikatDetail as TemplateSertifikatType } from "shared";

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
  // Optimasi: Add overall timeout untuk mencegah worker hang
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000); // 15s total timeout

  try {
    const transaksiId = Number(c.req.param("transaksiId"));
    if (isNaN(transaksiId)) {
      clearTimeout(timeout);
      return c.json({ success: false, message: "ID tidak valid" }, 400);
    }

    const db = getDb(c.env?.DATABASE_URL);
    const baseUrl = new URL(c.req.url).origin;

    // Optimasi: Single query dengan LEFT JOIN untuk mengambil transaksi + donatur + program + sertifikat
    const trxResult = await db.execute(sql`
      SELECT
        t.id,
        t.no_transaksi,
        t.donatur_id,
        t.program_id,
        t.jenis,
        t.tipe,
        t.jumlah,
        t.jumlah_terbilang,
        t.tanggal,
        t.status,
        d.id as donatur_id,
        d.nama as donatur_nama,
        d.alamat as donatur_alamat,
        p.id as program_id,
        p.nama_program,
        s.no_sertifikat
      FROM transaksi t
      LEFT JOIN donatur d ON t.donatur_id = d.id
      LEFT JOIN program p ON t.program_id = p.id
      LEFT JOIN sertifikat s ON t.id = s.transaksi_id
      WHERE t.id = ${transaksiId}
      LIMIT 1
    `);

    if (!trxResult || trxResult.rows.length === 0) {
      return c.json(
        { success: false, message: "Transaksi tidak ditemukan" },
        404,
      );
    }

    const trx = trxResult.rows[0] as any;

    if (trx.status !== "terverifikasi") {
      return c.json(
        {
          success: false,
          message: `Transaksi berstatus '${trx.status}'. Hanya transaksi terverifikasi yang bisa dicetak.`,
        },
        400,
      );
    }
    if (!trx.donatur_id || !trx.program_id) {
      return c.json(
        {
          success: false,
          message: "Data donatur atau program tidak ditemukan",
        },
        500,
      );
    }

    // Optimasi: Single query untuk template
    const templateResult = await db.execute(sql`
      SELECT
        id,
        nama_template,
        tipe,
        file_background,
        layout_field,
        penandatangan_1_id,
        penandatangan_2_id,
        aktif
      FROM template_sertifikat
      WHERE aktif = true AND tipe = ${trx.tipe}
      LIMIT 1
    `);

    if (!templateResult || templateResult.rows.length === 0) {
      return c.json(
        {
          success: false,
          message: `Template ${trx.tipe} belum diatur. Aktifkan template dengan tipe '${trx.tipe}' terlebih dahulu.`,
        },
        400,
      );
    }

    const template = templateResult.rows[0] as any;

    // Derive noSertifikat from existing sertifikat record or format according to tipe
    const defaultCertPrefix = trx.tipe === "zakat" ? "CERT-ZKT" : "CERT-WKF";
    const noSertifikat =
      trx.no_sertifikat ??
      trx.no_transaksi
        .replace(/^TRX-WKF\//, "CERT-WKF/")
        .replace(/^TRX-ZKT\//, "CERT-ZKT/")
        .replace(/^TRX\//, `${defaultCertPrefix}/`);
    const tanggalTerbit = trx.tanggal;

    const renderData: RenderData = {
      noTransaksi: trx.no_transaksi,
      noSertifikat,
      namaDonatur: trx.donatur_nama,
      alamatDonatur: trx.donatur_alamat ?? "",
      namaProgram: trx.nama_program,
      nominalAngka: `${Number(trx.jumlah).toLocaleString("id-ID")}`,
      jenis: trx.jenis,
      jumlahTerbilang: trx.jumlah_terbilang,
      tanggalTerbit,
    };

    // 4. Transform template ke format yang sesuai
    const templateFormatted: TemplateSertifikatType = {
      id: template.id,
      namaTemplate: template.nama_template,
      tipe: template.tipe,
      fileBackground: template.file_background,
      layoutField: template.layout_field,
      penandatangan1Id: template.penandatangan_1_id,
      penandatangan2Id: template.penandatangan_2_id,
      aktif: template.aktif,
      penandatangan1: null as any,
      penandatangan2: null as any,
    };

    // 5. Fetch background via link + render PDF in memory — zero disk I/O
    const pdfBytes = await renderSertifikatPDF(
      renderData,
      templateFormatted,
      baseUrl,
    );
    const filename = `${noSertifikat.replace(/\//g, "-")}.pdf`;

    clearTimeout(timeout);

    return new Response(pdfBytes, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    clearTimeout(timeout);
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
