import { Hono } from "hono";
import { eq, count, sql } from "drizzle-orm";
import { getDb } from "../db/client";
import { donatur, transaksi } from "../db/schema";
import type { ApiResponse, Donatur, PaginatedData } from "shared";

const app = new Hono();

// GET /donatur?page=1&limit=10&search=
app.get("/", async (c) => {
  const db = getDb();
  const page = Number(c.req.query("page") || "1");
  const limit = Number(c.req.query("limit") || "10");
  const search = c.req.query("search") as string;
  const offset = (page - 1) * limit;

  let query = db.select().from(donatur) as any;
  let countQuery = db.select({ total: count() }).from(donatur) as any;

  if (search) {
    query = query.where(sql`${donatur.nama} ILIKE ${`%${search}%`}`);
    countQuery = db.select({ total: count() }).from(donatur).where(sql`${donatur.nama} ILIKE ${`%${search}%`}`) as any;
  }

  const rows = await query
    .orderBy(donatur.id)
    .limit(limit)
    .offset(offset);

  const countResult = await countQuery;
  const total = countResult[0]?.total ?? 0;
  const totalPages = Math.ceil(total / limit);

  const data: Donatur[] = rows.map((r: any) => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
  }));

  return c.json<ApiResponse<PaginatedData<Donatur>>>({
    success: true,
    message: "OK",
    data: {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    },
  });
});

// GET /donatur/:id
app.get("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const db = getDb();
  const row = await db.query.donatur.findFirst({ where: eq(donatur.id, id) });
  if (!row) {
    return c.json<ApiResponse>({ success: false, message: "Donatur tidak ditemukan" }, 404);
  }
  const data: Donatur = { ...row, createdAt: row.createdAt.toISOString() };
  return c.json<ApiResponse<Donatur>>({ success: true, message: "OK", data });
});

// POST /donatur
app.post("/", async (c) => {
  const body = await c.req.json<Partial<Donatur>>();

  if (!body.nama || body.nama.trim() === "") {
    return c.json<ApiResponse>({ success: false, message: "Nama donatur wajib diisi" }, 400);
  }

  const db = getDb();

  const [row] = await db
    .insert(donatur)
    .values({
      nama: body.nama.trim(),
      noHp: body.noHp ?? null,
      email: body.email ?? null,
      alamat: body.alamat ?? null,
      nik: body.nik ?? null,
    })
    .returning();

  const data: Donatur = { ...row!, createdAt: row!.createdAt.toISOString() };
  return c.json<ApiResponse<Donatur>>({ success: true, message: "Donatur berhasil dibuat", data }, 201);
});

// PUT /donatur/:id
app.put("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const body = await c.req.json<Partial<Donatur>>();

  const db = getDb();
  const existing = await db.query.donatur.findFirst({ where: eq(donatur.id, id) });
  if (!existing) {
    return c.json<ApiResponse>({ success: false, message: "Donatur tidak ditemukan" }, 404);
  }

  if (body.nama !== undefined && body.nama.trim() === "") {
    return c.json<ApiResponse>({ success: false, message: "Nama donatur wajib diisi" }, 400);
  }

  const [row] = await db
    .update(donatur)
    .set({
      nama: body.nama?.trim() ?? existing.nama,
      noHp: body.noHp ?? existing.noHp,
      email: body.email ?? existing.email,
      alamat: body.alamat ?? existing.alamat,
      nik: body.nik ?? existing.nik,
    })
    .where(eq(donatur.id, id))
    .returning();

  const data: Donatur = { ...row!, createdAt: row!.createdAt.toISOString() };
  return c.json<ApiResponse<Donatur>>({ success: true, message: "Donatur berhasil diperbarui", data });
});

// DELETE /donatur/:id
app.delete("/:id", async (c) => {
  const id = Number(c.req.param("id"));

  const db = getDb();
  const existing = await db.query.donatur.findFirst({ where: eq(donatur.id, id) });
  if (!existing) {
    return c.json<ApiResponse>({ success: false, message: "Donatur tidak ditemukan" }, 404);
  }

  const result = await db
    .select({ total: count() })
    .from(transaksi)
    .where(eq(transaksi.donaturId, id));

  const total = result[0]?.total ?? 0;

  if (total > 0) {
    return c.json<ApiResponse>({
      success: false,
      message: "Donatur memiliki transaksi terkait dan tidak dapat dihapus",
    }, 409);
  }

  await db.delete(donatur).where(eq(donatur.id, id));
  return c.json<ApiResponse>({ success: true, message: "Donatur berhasil dihapus" });
});

export default app;
