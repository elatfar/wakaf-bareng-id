import { Hono } from "hono";
import { eq, count } from "drizzle-orm";
import { hash } from "bcryptjs";
import { getDb } from "../db/client";
import { pengguna } from "../db/schema";
import { requireRole } from "../middleware/role";
import type { ApiResponse, Pengguna, BuatPenggunaInput, PaginatedData } from "shared";

const app = new Hono();

// GET /pengguna?page=1&limit=10 (superadmin only) — exclude passwordHash
app.get("/", requireRole(["superadmin"]), async (c) => {
  const page = Number(c.req.query("page")) || 1;
  const limit = Number(c.req.query("limit")) || 10;
  const db = getDb();
  const offset = (page - 1) * limit;

  const rows = await db
    .select({
      id: pengguna.id,
      nama: pengguna.nama,
      email: pengguna.email,
      role: pengguna.role,
    })
    .from(pengguna)
    .limit(limit)
    .offset(offset);

  const countResult = await db.select({ total: count() }).from(pengguna);
  const total = countResult[0]?.total ?? 0;
  const totalPages = Math.ceil(total / limit);

  return c.json<ApiResponse<PaginatedData<Pengguna>>>({
    success: true,
    message: "OK",
    data: {
      data: rows,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    },
  });
});

// POST /pengguna (superadmin only)
app.post("/", requireRole(["superadmin"]), async (c) => {
  const body = await c.req.json<BuatPenggunaInput>();

  if (!body.nama || body.nama.trim() === "") {
    return c.json<ApiResponse>({ success: false, message: "Nama wajib diisi" }, 400);
  }
  if (!body.email || body.email.trim() === "") {
    return c.json<ApiResponse>({ success: false, message: "Email wajib diisi" }, 400);
  }
  if (!body.password || body.password.length < 6) {
    return c.json<ApiResponse>({ success: false, message: "Password minimal 6 karakter" }, 400);
  }
  if (!["superadmin", "admin", "kasir"].includes(body.role)) {
    return c.json<ApiResponse>({ success: false, message: "Role tidak valid" }, 400);
  }

  const db = getDb();
  // Check duplicate email
  const existing = await db.query.pengguna.findFirst({
    where: eq(pengguna.email, body.email.trim()),
  });
  if (existing) {
    return c.json<ApiResponse>({ success: false, message: "Email sudah digunakan" }, 409);
  }

  const passwordHash = await hash(body.password, 10);

  const [row] = await db
    .insert(pengguna)
    .values({
      nama: body.nama.trim(),
      email: body.email.trim(),
      passwordHash,
      role: body.role,
    })
    .returning({
      id: pengguna.id,
      nama: pengguna.nama,
      email: pengguna.email,
      role: pengguna.role,
    });

  return c.json<ApiResponse<Pengguna>>(
    { success: true, message: "Pengguna berhasil dibuat", data: row! },
    201
  );
});

export default app;
