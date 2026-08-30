import { Hono } from "hono";
import { cors } from "hono/cors";
import { serveStatic } from "hono/bun";
import authRoutes from "./routes/auth";
import donaturRoutes from "./routes/donatur";
import programRoutes from "./routes/program";
import penggunaRoutes from "./routes/pengguna";
import penandatanganRoutes from "./routes/penandatangan";
import transaksiRoutes from "./routes/transaksi";
import sertifikatRoutes from "./routes/sertifikat";
import templateRoutes from "./routes/template";
import { authMiddleware } from "./middleware/auth";

export const app = new Hono();

// CORS
app.use("*", cors());

// Static file serving for storage/ (PDFs, etc.)
app.use("/storage/*", serveStatic({ root: "./" }));

// Public routes (no auth required)
app.route("/auth", authRoutes);

// Sertifikat download endpoint — PUBLIC (diakses langsung via browser/WhatsApp)
// Harus didaftarkan SEBELUM authMiddleware untuk /sertifikat/*
app.use("/sertifikat/:id/download", async (c, next) => {
  // Skip auth — langsung lanjut ke route handler
  await next();
});

// Protected routes (auth required for all)
app.use("/donatur/*", authMiddleware);
app.use("/program/*", authMiddleware);
app.use("/pengguna/*", authMiddleware);
app.use("/penandatangan/*", authMiddleware);
app.use("/transaksi/*", authMiddleware);
// Sertifikat: auth untuk semua KECUALI download (sudah ditangani di atas)
app.use("/sertifikat/*", async (c, next) => {
  if (c.req.path.endsWith("/download")) {
    // Download sudah ditangani sebelumnya, skip auth
    await next();
    return;
  }
  return authMiddleware(c, next);
});
app.use("/template/*", authMiddleware);

app.route("/donatur", donaturRoutes);
app.route("/program", programRoutes);
app.route("/pengguna", penggunaRoutes);
app.route("/penandatangan", penandatanganRoutes);
app.route("/transaksi", transaksiRoutes);
app.route("/sertifikat", sertifikatRoutes);
app.route("/template", templateRoutes);

// Health check
app.get("/", (c) => c.json({ success: true, message: "Wakaf Bareng API" }));

export default app;
