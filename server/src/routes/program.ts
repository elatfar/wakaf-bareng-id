import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { db } from "../db/client";
import { program } from "../db/schema";
import { requireRole } from "../middleware/role";
import type { ApiResponse, Program, BuatProgramInput } from "shared";

const app = new Hono();

// GET /program?aktif=true
app.get("/", async (c) => {
  const aktifParam = c.req.query("aktif");
  let rows;
  if (aktifParam === "true") {
    rows = await db.select().from(program).where(eq(program.aktif, true));
  } else {
    rows = await db.select().from(program);
  }
  return c.json<ApiResponse<Program[]>>({ success: true, message: "OK", data: rows });
});

// GET /program/:id
app.get("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const row = await db.query.program.findFirst({ where: eq(program.id, id) });
  if (!row) {
    return c.json<ApiResponse>({ success: false, message: "Program tidak ditemukan" }, 404);
  }
  return c.json<ApiResponse<Program>>({ success: true, message: "OK", data: row });
});

// POST /program (superadmin only)
app.post("/", requireRole(["superadmin"]), async (c) => {
  const body = await c.req.json<BuatProgramInput>();

  if (!body.namaProgram || body.namaProgram.trim() === "") {
    return c.json<ApiResponse>({ success: false, message: "Nama program wajib diisi" }, 400);
  }

  const [row] = await db
    .insert(program)
    .values({ namaProgram: body.namaProgram.trim(), deskripsi: body.deskripsi ?? null })
    .returning();

  return c.json<ApiResponse<Program>>({ success: true, message: "Program berhasil dibuat", data: row! }, 201);
});

// PATCH /program/:id (superadmin only)
app.patch("/:id", requireRole(["superadmin"]), async (c) => {
  const id = Number(c.req.param("id"));
  const body = await c.req.json<{ aktif: boolean }>();

  const existing = await db.query.program.findFirst({ where: eq(program.id, id) });
  if (!existing) {
    return c.json<ApiResponse>({ success: false, message: "Program tidak ditemukan" }, 404);
  }

  const [row] = await db
    .update(program)
    .set({ aktif: body.aktif })
    .where(eq(program.id, id))
    .returning();

  return c.json<ApiResponse<Program>>({ success: true, message: "Status program diperbarui", data: row! });
});

export default app;
