import { Hono } from "hono";
import { cors } from "hono/cors";
import { eq } from "drizzle-orm";
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

// Cloudflare Workers environment bindings
export type Env = {
  DATABASE_URL: string;
  JWT_SECRET: string;
};

// Main app
export const app = new Hono<{ Bindings: Env }>();

// CORS - configured for single-origin deployment
app.use("*", cors({
  origin: "*", // Allow all origins for development, can be restricted in production
  credentials: true,
}));

// Initialize DB using Cloudflare secret on first request.
// getDb() is a lazy singleton — subsequent calls return the cached instance.
app.use("*", async (c, next) => {
  getDb(c.env?.DATABASE_URL);
  await next();
});

// Health check
app.get("/", (c) => c.json({ success: true, message: "Wakaf Bareng API" }));

// Public sertifikat download endpoint (no /api prefix for direct browser/WhatsApp access)
// Note: For Cloudflare Workers, file serving will need to be implemented differently
// This endpoint needs to be adapted for Cloudflare R2 or similar storage
app.get("/sertifikat/:id/download", async (c) => {
  const id = Number(c.req.param("id"));
  if (isNaN(id)) {
    return c.json({ success: false, message: "ID tidak valid" }, 400);
  }

  const db = getDb(c.env?.DATABASE_URL);
  const row = await db.query.sertifikat.findFirst({
    where: eq(sertifikat.id, id),
  });

  if (!row) {
    return c.json({ success: false, message: "Sertifikat tidak ditemukan" }, 404);
  }

  // For Cloudflare Workers, this needs to be implemented with R2 or similar
  // For now, return an error to indicate this needs implementation
  return c.json({ 
    success: false, 
    message: "File download belum diimplementasikan untuk Cloudflare Workers. Gunakan Cloudflare R2 atau storage eksternal." 
  }, 501);
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
