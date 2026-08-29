import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { db } from "../db/client";
import { penandatangan } from "../db/schema";
import { requireRole } from "../middleware/role";
import type { ApiResponse, Penandatangan, BuatPenandatanganInput } from "shared";

const app = new Hono();

// GET /penandatangan
app.get("/", async (c) => {
  const rows = await db.select().from(penandatangan);
  return c.json<ApiResponse<Penandatangan[]>>({ success: true, message: "OK", data: rows });
});

// GET /penandatangan/:id
app.get("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const row = await db.query.penandatangan.findFirst({ where: eq(penandatangan.id, id) });
  if (!row) {
    return c.json<ApiResponse>({ success: false, message: "Penandatangan tidak ditemukan" }, 404);
  }
  return c.json<ApiResponse<Penandatangan>>({ success: true, message: "OK", data: row });
});

// POST /penandatangan (superadmin only)
app.post("/", requireRole(["superadmin"]), async (c) => {
  const body = await c.req.json<BuatPenandatanganInput>();

  if (!body.nama || body.nama.trim() === "") {
    return c.json<ApiResponse>({ success: false, message: "Nama penandatangan wajib diisi" }, 400);
  }
  if (!body.jabatan || body.jabatan.trim() === "") {
    return c.json<ApiResponse>({ success: false, message: "Jabatan penandatangan wajib diisi" }, 400);
  }

  const [row] = await db
    .insert(penandatangan)
    .values({
      nama: body.nama.trim(),
      jabatan: body.jabatan.trim(),
      fileTtd: body.fileTtd ?? null,
      aktif: true,
    })
    .returning();

  return c.json<ApiResponse<Penandatangan>>(
    { success: true, message: "Penandatangan berhasil dibuat", data: row! },
    201
  );
});

// PUT /penandatangan/:id (superadmin only)
app.put("/:id", requireRole(["superadmin"]), async (c) => {
  const id = Number(c.req.param("id"));
  const body = await c.req.json<Partial<BuatPenandatanganInput> & { aktif?: boolean }>();

  const existing = await db.query.penandatangan.findFirst({ where: eq(penandatangan.id, id) });
  if (!existing) {
    return c.json<ApiResponse>({ success: false, message: "Penandatangan tidak ditemukan" }, 404);
  }

  const [row] = await db
    .update(penandatangan)
    .set({
      nama: body.nama?.trim() ?? existing.nama,
      jabatan: body.jabatan?.trim() ?? existing.jabatan,
      fileTtd: body.fileTtd ?? existing.fileTtd,
      aktif: body.aktif ?? existing.aktif,
    })
    .where(eq(penandatangan.id, id))
    .returning();

  return c.json<ApiResponse<Penandatangan>>({
    success: true,
    message: "Penandatangan berhasil diperbarui",
    data: row!,
  });
});

export default app;
