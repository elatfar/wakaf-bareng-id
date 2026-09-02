import { Hono } from "hono";
import { eq, count, sql, and } from "drizzle-orm";
import { getDb } from "../db/client";
import { transaksi, donatur, program, sertifikat, templateSertifikat, pengguna } from "../db/schema";
import { generateNomor } from "../lib/nomor";
import { angkaKeTerbilang } from "../lib/terbilang";
import type { ApiResponse, TransaksiDetail, BuatTransaksiInput, PaginatedData } from "shared";

const VALID_STATUS = ["pending", "terverifikasi", "batal"] as const;
type ValidStatus = (typeof VALID_STATUS)[number];

const app = new Hono();

// GET /transaksi?page=1&limit=10&tipe=&status=&programId=
app.get("/", async (c) => {
  const tipeParam = c.req.query("tipe");
  const statusParam = c.req.query("status");
  const programIdParam = c.req.query("programId");
  const page = Number(c.req.query("page")) || 1;
  const limit = Number(c.req.query("limit")) || 10;
  const db = getDb();
  const offset = (page - 1) * limit;

  // Build WHERE conditions dynamically
  const whereConditions: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;

  if (tipeParam && ["wakaf", "zakat"].includes(tipeParam)) {
    whereConditions.push(`t.tipe = $${paramIndex++}`);
    params.push(tipeParam);
  }
  if (statusParam && VALID_STATUS.includes(statusParam as ValidStatus)) {
    whereConditions.push(`t.status = $${paramIndex++}`);
    params.push(statusParam);
  }
  if (programIdParam && !isNaN(Number(programIdParam))) {
    whereConditions.push(`t.program_id = $${paramIndex++}`);
    params.push(Number(programIdParam));
  }

  const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(" AND ")}` : "";

  // Optimasi: Gunakan SQL manual dengan regular JOIN untuk menghindari LATERAL JOIN
  const query = sql`
    SELECT
      t.id,
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
      t.status,
      t.dicatat_oleh,
      t.catatan,
      t.created_at,
      d.id as donatur_id,
      d.nama as donatur_nama,
      d.no_hp as donatur_no_hp,
      p.id as program_id,
      p.nama_program,
      p.tipe as program_tipe,
      u.id as dicatat_oleh_id,
      u.nama as dicatat_oleh_nama,
      u.email as dicatat_oleh_email,
      u.role as dicatat_oleh_role
    FROM transaksi t
    LEFT JOIN donatur d ON t.donatur_id = d.id
    LEFT JOIN program p ON t.program_id = p.id
    LEFT JOIN pengguna u ON t.dicatat_oleh = u.id
    ${sql.raw(whereClause)}
    ORDER BY t.created_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `;

  const result = await db.execute(query);
  const rows = result.rows;

  // Get total count with same filters
  let countQuery = db.select({ total: count() }).from(transaksi) as any;
  if (tipeParam && ["wakaf", "zakat"].includes(tipeParam)) {
    countQuery = countQuery.where(eq(transaksi.tipe, tipeParam as "wakaf" | "zakat"));
  }
  if (statusParam && VALID_STATUS.includes(statusParam as ValidStatus)) {
    countQuery = countQuery.where(eq(transaksi.status, statusParam as ValidStatus));
  }
  if (programIdParam && !isNaN(Number(programIdParam))) {
    countQuery = countQuery.where(eq(transaksi.programId, Number(programIdParam)));
  }

  const countResult = await countQuery;
  const total = countResult[0]?.total ?? 0;
  const totalPages = Math.ceil(total / limit);

  // Transform hasil SQL ke format yang sesuai
  const data: TransaksiDetail[] = rows.map((r: any) => ({
    id: r.id,
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
    status: r.status,
    catatan: r.catatan,
    createdAt: r.created_at,
    donatur: {
      id: r.donatur_id,
      nama: r.donatur_nama,
      noHp: r.donatur_no_hp,
    } as any,
    program: {
      id: r.program_id,
      namaProgram: r.nama_program,
      tipe: r.program_tipe,
    } as any,
    dicatatOleh: r.dicatat_oleh_id ? {
      id: r.dicatat_oleh_id,
      nama: r.dicatat_oleh_nama,
      email: r.dicatat_oleh_email,
      role: r.dicatat_oleh_role,
    } : null,
  }));

  return c.json<ApiResponse<PaginatedData<TransaksiDetail>>>({
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

// GET /transaksi/:id
app.get("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const db = getDb();
  // Optimasi: Gunakan SQL manual dengan regular JOIN
  const result = await db.execute(sql`
    SELECT
      t.id,
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
      t.status,
      t.dicatat_oleh,
      t.catatan,
      t.created_at,
      d.id as donatur_id,
      d.nama as donatur_nama,
      d.no_hp as donatur_no_hp,
      p.id as program_id,
      p.nama_program,
      p.tipe as program_tipe,
      u.id as dicatat_oleh_id,
      u.nama as dicatat_oleh_nama,
      u.email as dicatat_oleh_email,
      u.role as dicatat_oleh_role
    FROM transaksi t
    LEFT JOIN donatur d ON t.donatur_id = d.id
    LEFT JOIN program p ON t.program_id = p.id
    LEFT JOIN pengguna u ON t.dicatat_oleh = u.id
    WHERE t.id = ${id}
    LIMIT 1
  `);

  if (!result || result.rows.length === 0) {
    return c.json<ApiResponse>({ success: false, message: "Transaksi tidak ditemukan" }, 404);
  }

  const r = result.rows[0] as any;
  const data: TransaksiDetail = {
    id: r.id,
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
    status: r.status,
    catatan: r.catatan,
    createdAt: r.created_at,
    donatur: {
      id: r.donatur_id,
      nama: r.donatur_nama,
      noHp: r.donatur_no_hp,
    } as any,
    program: {
      id: r.program_id,
      namaProgram: r.nama_program,
      tipe: r.program_tipe,
    } as any,
    dicatatOleh: r.dicatat_oleh_id ? {
      id: r.dicatat_oleh_id,
      nama: r.dicatat_oleh_nama,
      email: r.dicatat_oleh_email,
      role: r.dicatat_oleh_role,
    } : null,
  };

  return c.json<ApiResponse<TransaksiDetail>>({ success: true, message: "OK", data });
});

// POST /transaksi
app.post("/", async (c) => {
  const body = await c.req.json<BuatTransaksiInput>();

  const db = getDb();
  // Req 4.5: donaturId tidak ada → 404
  const donaturRow = await db.query.donatur.findFirst({
    where: eq(donatur.id, body.donaturId),
  });
  if (!donaturRow) {
    return c.json<ApiResponse>({ success: false, message: "Donatur tidak ditemukan" }, 404);
  }

  // Req 4.6: programId tidak ada → 400
  const programRow = await db.query.program.findFirst({
    where: eq(program.id, body.programId),
  });
  if (!programRow) {
    return c.json<ApiResponse>({ success: false, message: "Program tidak ditemukan" }, 400);
  }

  // Req 4.6: program tidak aktif → 400
  if (!programRow.aktif) {
    return c.json<ApiResponse>({ success: false, message: "Program tidak aktif" }, 400);
  }

  // Req 4.7: jenis=barang + deskripsiBarang kosong → 400
  if (body.jenis === "barang" && (!body.deskripsiBarang || body.deskripsiBarang.trim() === "")) {
    return c.json<ApiResponse>(
      { success: false, message: "Deskripsi barang wajib diisi untuk wakaf barang" },
      400
    );
  }

  // Req 4.1: jumlah harus > 0
  if (!body.jumlah || body.jumlah <= 0) {
    return c.json<ApiResponse>({ success: false, message: "Jumlah harus lebih dari 0" }, 400);
  }

  const isZakat = programRow.tipe === "zakat";
  const trxPrefix = isZakat ? "TRX-ZKT" : "TRX-WKF";
  const certPrefix = isZakat ? "CERT-ZKT" : "CERT-WKF";

  // Req 4.2: generate nomor transaksi unik (TRX-WKF/... atau TRX-ZKT/...)
  const noTransaksi = await generateNomor(trxPrefix, db);

  // Req 4.3: konversi jumlah ke terbilang
  const jumlahTerbilang = angkaKeTerbilang(Math.round(body.jumlah));

  const tanggal = body.tanggal ?? new Date().toISOString().substring(0, 10);

  const currentUser = c.get("pengguna");
  const [row] = await db
    .insert(transaksi)
    .values({
      noTransaksi,
      donaturId: body.donaturId,
      programId: body.programId,
      tipe: programRow.tipe,
      jenis: body.jenis,
      deskripsiBarang: body.jenis === "barang" ? (body.deskripsiBarang?.trim() ?? null) : null,
      jumlah: String(body.jumlah),
      jumlahTerbilang,
      metodePembayaran: body.metodePembayaran ?? null,
      tanggal,
      status: "terverifikasi",
      dicatatOleh: currentUser?.id ?? null,
      catatan: body.catatan ?? null,
    })
    .returning();

  const data = {
    ...row!,
    jumlah: Number(row!.jumlah),
    createdAt: row!.createdAt.toISOString(),
  };

  // Auto-create sertifikat record so noSertifikat is immediately available (CERT-WKF/... atau CERT-ZKT/...)
  // Find active template for this tipe
  const activeTemplate = await db.query.templateSertifikat.findFirst({
    where: (t, { eq: teq, and: tand }) => tand(
      teq(t.aktif, true),
      teq(t.tipe, programRow.tipe)
    ),
  });

  if (activeTemplate) {
    const noSertifikat = await generateNomor(certPrefix, db);
    await db.insert(sertifikat).values({
      transaksiId: row!.id,
      templateId: activeTemplate.id,
      noSertifikat,
      tanggalTerbit: tanggal,
      filePath: null,
      status: "terbit",
    });
  }

  return c.json<ApiResponse<typeof data>>(
    { success: true, message: "Transaksi berhasil dicatat", data },
    201
  );
});

// PATCH /transaksi/:id/status
app.patch("/:id/status", async (c) => {
  const id = Number(c.req.param("id"));
  const body = await c.req.json<{ status: string }>();

  if (!VALID_STATUS.includes(body.status as ValidStatus)) {
    return c.json<ApiResponse>(
      { success: false, message: `Status tidak valid. Gunakan: ${VALID_STATUS.join(", ")}` },
      400
    );
  }

  const db = getDb();
  const existing = await db.query.transaksi.findFirst({
    where: eq(transaksi.id, id),
  });
  if (!existing) {
    return c.json<ApiResponse>({ success: false, message: "Transaksi tidak ditemukan" }, 404);
  }

  const currentUser = c.get("pengguna");
  const updatePayload: Record<string, any> = { status: body.status as ValidStatus };
  if (currentUser?.id) {
    updatePayload.dicatatOleh = currentUser.id;
  }

  const [row] = await db
    .update(transaksi)
    .set(updatePayload)
    .where(eq(transaksi.id, id))
    .returning();

  const data = {
    ...row!,
    jumlah: Number(row!.jumlah),
    createdAt: row!.createdAt.toISOString(),
  };

  return c.json<ApiResponse<typeof data>>({
    success: true,
    message: "Status transaksi diperbarui",
    data,
  });
});

export default app;
