import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { getDb } from "../db/client";
import { sertifikat, transaksi, templateSertifikat } from "../db/schema";
import { requireRole } from "../middleware/role";
import { generateNomor } from "../lib/nomor";
import { renderSertifikatPDF } from "../lib/pdf";
import type { RenderData } from "../lib/pdf";
import type { ApiResponse, Sertifikat, TemplateSertifikat as TemplateSertifikatType } from "shared";

const VALID_DIKIRIM_VIA = ["whatsapp", "email"] as const;
const VALID_STATUS_SERTIFIKAT = ["draft", "terbit", "dicetak", "dikirim"] as const;

const app = new Hono();

// GET /sertifikat
app.get("/", async (c) => {
  const db = getDb();
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
  });

  const data = rows.map((r) => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
    transaksi: r.transaksi
      ? { ...r.transaksi, jumlah: Number(r.transaksi.jumlah), createdAt: r.transaksi.createdAt.toISOString() }
      : null,
  }));

  return c.json<ApiResponse<typeof data>>({ success: true, message: "OK", data });
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

  const responseData = {
    ...row,
    createdAt: row.createdAt.toISOString(),
    transaksi: row.transaksi
      ? { ...row.transaksi, jumlah: Number(row.transaksi.jumlah), createdAt: row.transaksi.createdAt.toISOString() }
      : null,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return c.json<ApiResponse<any>>({ success: true, message: "OK", data: responseData });
});

// GET /sertifikat/:id/download — generate PDF in-memory and stream to browser, no disk I/O
app.get("/:id/download", async (c) => {
  const id = Number(c.req.param("id"));
  if (isNaN(id)) return c.json<ApiResponse>({ success: false, message: "ID tidak valid" }, 400);

  const db = getDb();

  const row = await db.query.sertifikat.findFirst({
    where: eq(sertifikat.id, id),
    with: {
      transaksi: {
        with: { donatur: true, program: true },
      },
    },
  });

  if (!row) return c.json<ApiResponse>({ success: false, message: "Sertifikat tidak ditemukan" }, 404);
  if (!row.transaksi?.donatur || !row.transaksi?.program) {
    return c.json<ApiResponse>({ success: false, message: "Data transaksi tidak lengkap" }, 500);
  }

  const template = await db.query.templateSertifikat.findFirst({
    where: eq(templateSertifikat.id, row.templateId),
  });
  if (!template) return c.json<ApiResponse>({ success: false, message: "Template tidak ditemukan" }, 404);

  const renderData: RenderData = {
    noTransaksi: row.transaksi.noTransaksi,
    noSertifikat: row.noSertifikat,
    namaDonatur: row.transaksi.donatur.nama,
    namaProgram: row.transaksi.program.namaProgram,
    jenis: row.transaksi.jenis,
    jumlahTerbilang: row.transaksi.jumlahTerbilang,
    tanggalTerbit: row.tanggalTerbit,
  };

  try {
    const pdfBytes = await renderSertifikatPDF(renderData, template as TemplateSertifikatType);
    const filename = `${row.noSertifikat.replace(/\//g, "-")}.pdf`;

    return new Response(pdfBytes, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("Error generating PDF for download:", err);
    const message = err instanceof Error ? err.message : "Gagal membuat PDF";
    return c.json<ApiResponse>({ success: false, message }, 500);
  }
});

// POST /sertifikat/generate/:transaksiId
app.post("/generate/:transaksiId", requireRole(["admin", "superadmin"]), async (c) => {
  try {
    const transaksiId = Number(c.req.param("transaksiId"));
    if (isNaN(transaksiId)) {
      return c.json<ApiResponse>({ success: false, message: "ID transaksi tidak valid" }, 400);
    }

    const db = getDb();

    const trx = await db.query.transaksi.findFirst({
      where: eq(transaksi.id, transaksiId),
      with: { donatur: true, program: true },
    });

    if (!trx) return c.json<ApiResponse>({ success: false, message: "Transaksi tidak ditemukan" }, 400);
    if (trx.status !== "terverifikasi") {
      return c.json<ApiResponse>({
        success: false,
        message: `Transaksi berstatus '${trx.status}', hanya transaksi 'terverifikasi' yang bisa diterbitkan sertifikatnya`,
      }, 400);
    }

    const template = await db.query.templateSertifikat.findFirst({
      where: eq(templateSertifikat.aktif, true),
    });
    if (!template) return c.json<ApiResponse>({ success: false, message: "Template sertifikat belum diatur" }, 400);

    const existing = await db.query.sertifikat.findFirst({
      where: eq(sertifikat.transaksiId, transaksiId),
    });
    if (existing) {
      return c.json<ApiResponse>({ success: false, message: "Sertifikat untuk transaksi ini sudah pernah diterbitkan" }, 409);
    }

    const noSertifikat = await generateNomor("CERT", db);
    const today = new Date().toISOString().split("T")[0]!;

    const renderData: RenderData = {
      noTransaksi: trx.noTransaksi,
      noSertifikat,
      namaDonatur: trx.donatur!.nama,
      namaProgram: trx.program!.namaProgram,
      jenis: trx.jenis,
      jumlahTerbilang: trx.jumlahTerbilang,
      tanggalTerbit: today,
    };

    // Validate the template can actually render before committing to DB
    await renderSertifikatPDF(renderData, template as TemplateSertifikatType);

    // Insert record — filePath is null, PDF is always generated on-demand
    const [row] = await db
      .insert(sertifikat)
      .values({
        transaksiId,
        templateId: template.id,
        noSertifikat,
        tanggalTerbit: today,
        filePath: null,
        status: "terbit",
      })
      .returning();

    return c.json<ApiResponse<Sertifikat>>(
      {
        success: true,
        message: "Sertifikat berhasil diterbitkan",
        data: { ...row!, createdAt: row!.createdAt.toISOString() },
      },
      201
    );
  } catch (err) {
    console.error("Error generating sertifikat:", err);
    const message = err instanceof Error ? err.message : "Terjadi kesalahan internal";
    return c.json<ApiResponse>({ success: false, message }, 500);
  }
});

// PATCH /sertifikat/:id/status
app.patch("/:id/status", async (c) => {
  const id = Number(c.req.param("id"));
  if (isNaN(id)) return c.json<ApiResponse>({ success: false, message: "ID tidak valid" }, 400);

  const body = await c.req.json<{ status?: string; dikirimVia?: string }>();

  if (!body.status || !VALID_STATUS_SERTIFIKAT.includes(body.status as (typeof VALID_STATUS_SERTIFIKAT)[number])) {
    return c.json<ApiResponse>({
      success: false,
      message: `Status tidak valid. Gunakan: ${VALID_STATUS_SERTIFIKAT.join(", ")}`,
    }, 400);
  }
  if (body.dikirimVia && !VALID_DIKIRIM_VIA.includes(body.dikirimVia as (typeof VALID_DIKIRIM_VIA)[number])) {
    return c.json<ApiResponse>({ success: false, message: "dikirimVia harus 'whatsapp' atau 'email'" }, 400);
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
