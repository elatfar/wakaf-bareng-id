import { Hono } from "hono";
import { eq, count, sql } from "drizzle-orm";
import { getDb } from "../db/client";
import { sertifikat, transaksi, donatur, program } from "../db/schema";
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

  // Optimasi: Gunakan SQL manual dengan regular JOIN untuk menghindari LATERAL JOIN
  const result = await db.execute(sql`
    SELECT
      s.id,
      s.transaksi_id,
      s.template_id,
      s.no_sertifikat,
      s.tanggal_terbit,
      s.file_path,
      s.status,
      s.dikirim_via,
      s.created_at,
      t.id as transaksi_id,
      t.no_transaksi,
      t.donatur_id,
      t.program_id,
      t.jenis,
      t.tipe,
      t.deskripsi_barang,
      t.jumlah,
      t.jumlah_terbilang,
      t.metode_pembayaran,
      t.tanggal,
      t.status as transaksi_status,
      t.dicatat_oleh,
      t.catatan,
      t.created_at as transaksi_created_at,
      d.id as donatur_id,
      d.nama as donatur_nama,
      d.no_hp as donatur_no_hp,
      p.id as program_id,
      p.nama_program
    FROM sertifikat s
    LEFT JOIN transaksi t ON s.transaksi_id = t.id
    LEFT JOIN donatur d ON t.donatur_id = d.id
    LEFT JOIN program p ON t.program_id = p.id
    ORDER BY s.tanggal_terbit DESC
    LIMIT ${limit} OFFSET ${offset}
  `);
  const rows = result.rows;

  const countResult = await db.select({ total: count() }).from(sertifikat);
  const total = countResult[0]?.total ?? 0;
  const totalPages = Math.ceil(total / limit);

  // Transform hasil SQL ke format yang sesuai
  const data = rows.map((r: any) => ({
    id: r.id,
    transaksiId: r.transaksi_id,
    templateId: r.template_id,
    noSertifikat: r.no_sertifikat,
    tanggalTerbit: r.tanggal_terbit,
    filePath: r.file_path,
    status: r.status,
    dikirimVia: r.dikirim_via,
    createdAt: r.created_at,
    transaksi: r.transaksi_id ? {
      id: r.transaksi_id,
      noTransaksi: r.no_transaksi,
      donaturId: r.donatur_id,
      programId: r.program_id,
      jenis: r.jenis,
      tipe: r.tipe,
      deskripsiBarang: r.deskripsi_barang,
      jumlah: Number(r.jumlah),
      jumlahTerbilang: r.jumlah_terbilang,
      metodePembayaran: r.metode_pembayaran,
      tanggal: r.tanggal,
      status: r.transaksi_status,
      dicatatOleh: r.dicatat_oleh,
      catatan: r.catatan,
      createdAt: r.transaksi_created_at,
      donatur: r.donatur_id ? {
        id: r.donatur_id,
        nama: r.donatur_nama,
        noHp: r.donatur_no_hp,
      } as any : null,
      program: r.program_id ? {
        id: r.program_id,
        namaProgram: r.nama_program,
      } as any : null,
    } : null,
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
  // Optimasi: Gunakan SQL manual dengan regular JOIN
  const result = await db.execute(sql`
    SELECT
      s.id,
      s.transaksi_id,
      s.template_id,
      s.no_sertifikat,
      s.tanggal_terbit,
      s.file_path,
      s.status,
      s.dikirim_via,
      s.created_at,
      t.id as transaksi_id,
      t.no_transaksi,
      t.donatur_id,
      t.program_id,
      t.jenis,
      t.tipe,
      t.deskripsi_barang,
      t.jumlah,
      t.jumlah_terbilang,
      t.metode_pembayaran,
      t.tanggal,
      t.status as transaksi_status,
      t.dicatat_oleh,
      t.catatan,
      t.created_at as transaksi_created_at,
      d.id as donatur_id,
      d.nama as donatur_nama,
      d.no_hp as donatur_no_hp,
      p.id as program_id,
      p.nama_program
    FROM sertifikat s
    LEFT JOIN transaksi t ON s.transaksi_id = t.id
    LEFT JOIN donatur d ON t.donatur_id = d.id
    LEFT JOIN program p ON t.program_id = p.id
    WHERE s.id = ${id}
    LIMIT 1
  `);

  if (!result || result.rows.length === 0) return c.json<ApiResponse>({ success: false, message: "Sertifikat tidak ditemukan" }, 404);

  const r = result.rows[0] as any;
  const data = {
    id: r.id,
    transaksiId: r.transaksi_id,
    templateId: r.template_id,
    noSertifikat: r.no_sertifikat,
    tanggalTerbit: r.tanggal_terbit,
    filePath: r.file_path,
    status: r.status,
    dikirimVia: r.dikirim_via,
    createdAt: r.created_at,
    transaksi: r.transaksi_id ? {
      id: r.transaksi_id,
      noTransaksi: r.no_transaksi,
      donaturId: r.donatur_id,
      programId: r.program_id,
      jenis: r.jenis,
      tipe: r.tipe,
      deskripsiBarang: r.deskripsi_barang,
      jumlah: Number(r.jumlah),
      jumlahTerbilang: r.jumlah_terbilang,
      metodePembayaran: r.metode_pembayaran,
      tanggal: r.tanggal,
      status: r.transaksi_status,
      dicatatOleh: r.dicatat_oleh,
      catatan: r.catatan,
      createdAt: r.transaksi_created_at,
      donatur: r.donatur_id ? {
        id: r.donatur_id,
        nama: r.donatur_nama,
        noHp: r.donatur_no_hp,
      } as any : null,
      program: r.program_id ? {
        id: r.program_id,
        namaProgram: r.nama_program,
      } as any : null,
    } : null,
  };

  return c.json({
    success: true,
    message: "OK",
    data,
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
