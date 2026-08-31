import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { getDb } from "../db/client";
import { transaksi, donatur, program } from "../db/schema";
import { generateNomor } from "../lib/nomor";
import { angkaKeTerbilang } from "../lib/terbilang";
import type { ApiResponse, TransaksiDetail, BuatTransaksiInput } from "shared";

const VALID_STATUS = ["pending", "terverifikasi", "batal"] as const;
type ValidStatus = (typeof VALID_STATUS)[number];

const app = new Hono();

// GET /transaksi — daftar dengan donatur dan program
app.get("/", async (c) => {
  const db = getDb();
  const rows = await db.query.transaksi.findMany({
    with: {
      donatur: { columns: { id: true, nama: true, noHp: true } },
      program: { columns: { id: true, namaProgram: true } },
    },
    orderBy: (t, { desc }) => [desc(t.createdAt)],
  });

  const data: TransaksiDetail[] = rows.map((r) => ({
    ...r,
    jumlah: Number(r.jumlah),
    createdAt: r.createdAt.toISOString(),
  }));

  return c.json<ApiResponse<TransaksiDetail[]>>({ success: true, message: "OK", data });
});

// GET /transaksi/:id
app.get("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const db = getDb();
  const row = await db.query.transaksi.findFirst({
    where: eq(transaksi.id, id),
    with: {
      donatur: { columns: { id: true, nama: true, noHp: true } },
      program: { columns: { id: true, namaProgram: true } },
    },
  });
  if (!row) {
    return c.json<ApiResponse>({ success: false, message: "Transaksi tidak ditemukan" }, 404);
  }
  const data: TransaksiDetail = {
    ...row,
    jumlah: Number(row.jumlah),
    createdAt: row.createdAt.toISOString(),
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

  // Req 4.2: generate nomor transaksi unik
  const noTransaksi = await generateNomor("TRX", db);

  // Req 4.3: konversi jumlah ke terbilang
  const jumlahTerbilang = angkaKeTerbilang(Math.round(body.jumlah));

  const tanggal = body.tanggal ?? new Date().toISOString().substring(0, 10);

  const [row] = await db
    .insert(transaksi)
    .values({
      noTransaksi,
      donaturId: body.donaturId,
      programId: body.programId,
      jenis: body.jenis,
      deskripsiBarang: body.jenis === "barang" ? (body.deskripsiBarang?.trim() ?? null) : null,
      jumlah: String(body.jumlah),
      jumlahTerbilang,
      metodePembayaran: body.metodePembayaran ?? null,
      tanggal,
      status: "terverifikasi",
      catatan: body.catatan ?? null,
    })
    .returning();

  const data = {
    ...row!,
    jumlah: Number(row!.jumlah),
    createdAt: row!.createdAt.toISOString(),
  };

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

  const [row] = await db
    .update(transaksi)
    .set({ status: body.status as ValidStatus })
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
