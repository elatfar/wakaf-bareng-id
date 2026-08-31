import { Hono } from "hono";
import { cors } from "hono/cors";
import { serveStatic } from "hono/bun";
import { eq } from "drizzle-orm";
import * as fs from "fs";
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
import { sertifikat } from "./db/schema";

// Main app for Bun development
export const app = new Hono();

// CORS - configured for single-origin deployment
app.use("*", cors({
  origin: "*", // Allow all origins for development, can be restricted in production
  credentials: true,
}));

// Static file serving for storage/ (PDFs, etc.)
app.use("/storage/*", serveStatic({ root: "./" }));

// Health check
app.get("/", (c) => c.json({ success: true, message: "Wakaf Bareng API" }));

// Public sertifikat download endpoint (no /api prefix for direct browser/WhatsApp access)
app.get("/sertifikat/:id/download", async (c) => {
  const id = Number(c.req.param("id"));
  if (isNaN(id)) {
    return c.json({ success: false, message: "ID tidak valid" }, 400);
  }

  const db = getDb();
  const row = await db.query.sertifikat.findFirst({
    where: eq(sertifikat.id, id),
  });

  if (!row) {
    return c.json({ success: false, message: "Sertifikat tidak ditemukan" }, 404);
  }

  if (!row.filePath || !fs.existsSync(row.filePath)) {
    return c.json({ success: false, message: "File sertifikat tidak ditemukan" }, 404);
  }

  const fileBytes = fs.readFileSync(row.filePath);
  const filename = `${row.noSertifikat.replace(/\//g, "-")}.pdf`;

  return new Response(fileBytes, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
});

// API routes with /api prefix
// Health check for API
app.get("/api", (c) => c.json({ success: true, message: "Wakaf Bareng API" }));

// Public routes (no auth required)
app.route("/api/auth", authRoutes);

// Sertifikat download endpoint — PUBLIC (diakses langsung via browser/WhatsApp)
app.use("/api/sertifikat/:id/download", async (c, next) => {
  await next();
});

// Protected routes (auth required for all)
app.use("/api/donatur/*", authMiddleware);
app.use("/api/program/*", authMiddleware);
app.use("/api/pengguna/*", authMiddleware);
app.use("/api/penandatangan/*", authMiddleware);
app.use("/api/transaksi/*", authMiddleware);
app.use("/api/sertifikat/*", async (c, next) => {
  if (c.req.path.endsWith("/download")) {
    await next();
    return;
  }
  return authMiddleware(c, next);
});
app.use("/api/template/*", authMiddleware);

app.route("/api/donatur", donaturRoutes);
app.route("/api/program", programRoutes);
app.route("/api/pengguna", penggunaRoutes);
app.route("/api/penandatangan", penandatanganRoutes);
app.route("/api/transaksi", transaksiRoutes);
app.route("/api/sertifikat", sertifikatRoutes);
app.route("/api/template", templateRoutes);

export default app;
