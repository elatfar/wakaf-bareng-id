import { Hono } from "hono";
import { eq, count } from "drizzle-orm";
import { getDb } from "../db/client";
import { sertifikat } from "../db/schema";
import type { ApiResponse, Sertifikat, PaginatedData } from "shared";

const VALID_DIKIRIM_VIA = ["whatsapp", "email"] as const;
const VALID_STATUS_SERTIFIKAT = ["draft", "terbit", "dicetak", "dikirim"] as const;

const app = new Hono();

// GET /sertifikat?page=1&limit=10
app.get("/", async (c) => {
  const page = Number(c.req.query("page")) || 1;
  const limit = Number(c.req.query("limit")) || 10;
  const db = getDb();
  const offset = (page - 1) * limit;

  const rows = await db.query.sertifikat.findMany({
    with: {
      transaksi: {
        with: {
          donatur: { columns: { id: true, nama: true, noHp: true } },
          program: { columns: { id: true, namaProgram: true } },
        },
      },
    },
    orderBy: (s, { desc }) => [desc(s.tanggalTerbit)],
    limit: limit,
    offset: offset,
  });

  const countResult = await db.select({ total: count() }).from(sertifikat);
  const total = countResult[0]?.total ?? 0;
  const totalPages = Math.ceil(total / limit);

  const data = rows.map((r: any) => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
    transaksi: r.transaksi
      ? { ...r.transaksi, jumlah: Number(r.transaksi.jumlah), createdAt: r.transaksi.createdAt.toISOString() }
      : null,
  }));

  return c.json<ApiResponse<PaginatedData<Sertifikat>>>({
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

// GET /sertifikat/:id
app.get("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  if (isNaN(id)) return c.json<ApiResponse>({ success: false, message: "ID tidak valid" }, 400);

  const db = getDb();
  const row = await db.query.sertifikat.findFirst({
    where: eq(sertifikat.id, id),
    with: {
      transaksi: {
        with: {
          donatur: { columns: { id: true, nama: true, noHp: true } },
          program: { columns: { id: true, namaProgram: true } },
        },
      },
    },
  });

  if (!row) return c.json<ApiResponse>({ success: false, message: "Sertifikat tidak ditemukan" }, 404);

  return c.json({
    success: true,
    message: "OK",
    data: {
      ...row,
      createdAt: row.createdAt.toISOString(),
      transaksi: row.transaksi
        ? { ...row.transaksi, jumlah: Number(row.transaksi.jumlah), createdAt: row.transaksi.createdAt.toISOString() }
        : null,
    },
  });
});

// PATCH /sertifikat/:id/status
app.patch("/:id/status", async (c) => {
  const id = Number(c.req.param("id"));
  if (isNaN(id)) return c.json<ApiResponse>({ success: false, message: "ID tidak valid" }, 400);

  const body = await c.req.json<{ status?: string; dikirimVia?: string }>();

  if (
    !body.status ||
    !VALID_STATUS_SERTIFIKAT.includes(body.status as (typeof VALID_STATUS_SERTIFIKAT)[number])
  ) {
    return c.json<ApiResponse>(
      { success: false, message: `Status tidak valid. Gunakan: ${VALID_STATUS_SERTIFIKAT.join(", ")}` },
      400
    );
  }
  if (
    body.dikirimVia &&
    !VALID_DIKIRIM_VIA.includes(body.dikirimVia as (typeof VALID_DIKIRIM_VIA)[number])
  ) {
    return c.json<ApiResponse>(
      { success: false, message: "dikirimVia harus 'whatsapp' atau 'email'" },
      400
    );
  }

  const db = getDb();
  const existingRow = await db.query.sertifikat.findFirst({ where: eq(sertifikat.id, id) });
  if (!existingRow) return c.json<ApiResponse>({ success: false, message: "Sertifikat tidak ditemukan" }, 404);

  const [row] = await db
    .update(sertifikat)
    .set({
      status: body.status as (typeof VALID_STATUS_SERTIFIKAT)[number],
      dikirimVia: body.dikirimVia ?? existingRow.dikirimVia,
    })
    .where(eq(sertifikat.id, id))
    .returning();

  return c.json<ApiResponse<Sertifikat>>({
    success: true,
    message: "Status sertifikat diperbarui",
    data: { ...row!, createdAt: row!.createdAt.toISOString() },
  });
});

export default app;
