import { Hono } from "hono";
import { eq, count, sql } from "drizzle-orm";
import { getDb } from "../db/client";
import { templateSertifikat, penandatangan } from "../db/schema";
import { requireRole } from "../middleware/role";
import type {
  ApiResponse,
  BuatTemplateInput,
  LayoutField,
  TemplateSertifikatDetail,
  PaginatedData,
} from "shared";

const REQUIRED_CANVAS_FIELDS = ["canvasWidth", "canvasHeight"] as const;

function isLayoutFieldItem(item: unknown): boolean {
  if (!item || typeof item !== "object") return false;
  const obj = item as Record<string, unknown>;
  return (
    typeof obj.x === "number" &&
    typeof obj.y === "number" &&
    typeof obj.size === "number" &&
    ["left", "center", "right"].includes(obj.align as string) &&
    typeof obj.bold === "boolean"
  );
}

function validateLayoutField(lf: unknown): lf is LayoutField {
  if (!lf || typeof lf !== "object") return false;
  const obj = lf as Record<string, unknown>;

  // canvasWidth and canvasHeight are required
  if (typeof obj.canvasWidth !== "number" || obj.canvasWidth <= 0) return false;
  if (typeof obj.canvasHeight !== "number" || obj.canvasHeight <= 0) return false;

  // Validate any provided field items
  for (const [key, value] of Object.entries(obj)) {
    if (key === "canvasWidth" || key === "canvasHeight") continue;
    if (value !== undefined && value !== null && !isLayoutFieldItem(value)) {
      return false;
    }
  }

  return true;
}

function getMissingLayoutFields(lf: unknown): string[] {
  if (!lf || typeof lf !== "object") return ["canvasWidth", "canvasHeight"];
  const obj = lf as Record<string, unknown>;
  const missing: string[] = [];
  if (typeof obj.canvasWidth !== "number" || obj.canvasWidth <= 0) missing.push("canvasWidth");
  if (typeof obj.canvasHeight !== "number" || obj.canvasHeight <= 0) missing.push("canvasHeight");
  return missing;
}

const app = new Hono();

// GET /template?page=1&limit=10 — return all templates with penandatangan data (JOIN via SQL manual)
app.get("/", async (c) => {
  const page = Number(c.req.query("page")) || 1;
  const limit = Number(c.req.query("limit")) || 10;
  const db = getDb();
  const offset = (page - 1) * limit;

  // Optimasi: Gunakan SQL manual dengan regular LEFT JOIN untuk menghindari LATERAL JOIN
  const result = await db.execute(sql`
    SELECT
      t.id,
      t.nama_template,
      t.tipe,
      t.file_background,
      t.layout_field,
      t.penandatangan_1_id,
      t.penandatangan_2_id,
      t.aktif,
      p1.id as penandatangan1_id,
      p1.nama as penandatangan1_nama,
      p1.jabatan as penandatangan1_jabatan,
      p1.file_ttd as penandatangan1_file_ttd,
      p1.aktif as penandatangan1_aktif,
      p2.id as penandatangan2_id,
      p2.nama as penandatangan2_nama,
      p2.jabatan as penandatangan2_jabatan,
      p2.file_ttd as penandatangan2_file_ttd,
      p2.aktif as penandatangan2_aktif
    FROM template_sertifikat t
    LEFT JOIN penandatangan p1 ON t.penandatangan_1_id = p1.id
    LEFT JOIN penandatangan p2 ON t.penandatangan_2_id = p2.id
    LIMIT ${limit} OFFSET ${offset}
  `);
  const templates = result.rows;

  const countResult = await db.select({ total: count() }).from(templateSertifikat);
  const total = countResult[0]?.total ?? 0;
  const totalPages = Math.ceil(total / limit);

  // Transform hasil SQL ke format yang sesuai
  const data = templates.map((t: any) => ({
    id: t.id,
    namaTemplate: t.nama_template,
    tipe: t.tipe,
    fileBackground: t.file_background,
    layoutField: t.layout_field as LayoutField,
    penandatangan1Id: t.penandatangan_1_id,
    penandatangan2Id: t.penandatangan_2_id,
    aktif: t.aktif,
    penandatangan1: t.penandatangan1_id ? {
      id: t.penandatangan1_id,
      nama: t.penandatangan1_nama,
      jabatan: t.penandatangan1_jabatan,
      fileTtd: t.penandatangan1_file_ttd,
      aktif: t.penandatangan1_aktif,
    } as any : null,
    penandatangan2: t.penandatangan2_id ? {
      id: t.penandatangan2_id,
      nama: t.penandatangan2_nama,
      jabatan: t.penandatangan2_jabatan,
      fileTtd: t.penandatangan2_file_ttd,
      aktif: t.penandatangan2_aktif,
    } as any : null,
  }));

  return c.json<ApiResponse<PaginatedData<TemplateSertifikatDetail>>>({
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

// GET /template/:id
app.get("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  if (isNaN(id)) {
    return c.json<ApiResponse>({ success: false, message: "ID tidak valid" }, 400);
  }

  const db = getDb();
  // Optimasi: Gunakan SQL manual dengan regular LEFT JOIN
  const result = await db.execute(sql`
    SELECT
      t.id,
      t.nama_template,
      t.tipe,
      t.file_background,
      t.layout_field,
      t.penandatangan_1_id,
      t.penandatangan_2_id,
      t.aktif,
      p1.id as penandatangan1_id,
      p1.nama as penandatangan1_nama,
      p1.jabatan as penandatangan1_jabatan,
      p1.file_ttd as penandatangan1_file_ttd,
      p1.aktif as penandatangan1_aktif,
      p2.id as penandatangan2_id,
      p2.nama as penandatangan2_nama,
      p2.jabatan as penandatangan2_jabatan,
      p2.file_ttd as penandatangan2_file_ttd,
      p2.aktif as penandatangan2_aktif
    FROM template_sertifikat t
    LEFT JOIN penandatangan p1 ON t.penandatangan_1_id = p1.id
    LEFT JOIN penandatangan p2 ON t.penandatangan_2_id = p2.id
    WHERE t.id = ${id}
    LIMIT 1
  `);

  if (!result || result.rows.length === 0) {
    return c.json<ApiResponse>({ success: false, message: "Template tidak ditemukan" }, 404);
  }

  const t = result.rows[0] as any;
  const data: TemplateSertifikatDetail = {
    id: t.id,
    namaTemplate: t.nama_template,
    tipe: t.tipe,
    fileBackground: t.file_background,
    layoutField: t.layout_field as LayoutField,
    penandatangan1Id: t.penandatangan_1_id,
    penandatangan2Id: t.penandatangan_2_id,
    aktif: t.aktif,
    penandatangan1: t.penandatangan1_id ? {
      id: t.penandatangan1_id,
      nama: t.penandatangan1_nama,
      jabatan: t.penandatangan1_jabatan,
      fileTtd: t.penandatangan1_file_ttd,
      aktif: t.penandatangan1_aktif,
    } as any : null,
    penandatangan2: t.penandatangan2_id ? {
      id: t.penandatangan2_id,
      nama: t.penandatangan2_nama,
      jabatan: t.penandatangan2_jabatan,
      fileTtd: t.penandatangan2_file_ttd,
      aktif: t.penandatangan2_aktif,
    } as any : null,
  };

  return c.json<ApiResponse<TemplateSertifikatDetail>>({
    success: true,
    message: "OK",
    data,
  });
});

// POST /template (superadmin only) — validasi layoutField 7 field wajib → 400, insert → 201
app.post("/", requireRole(["superadmin"]), async (c) => {
  const body = await c.req.json<BuatTemplateInput>();

  if (!body.namaTemplate || body.namaTemplate.trim() === "") {
    return c.json<ApiResponse>({ success: false, message: "Nama template wajib diisi" }, 400);
  }

  if (!body.fileBackground || body.fileBackground.trim() === "") {
    return c.json<ApiResponse>({ success: false, message: "File background wajib diisi" }, 400);
  }

  const tipeValue = (body as any).tipe as string;
  if (!tipeValue || !["wakaf", "zakat"].includes(tipeValue)) {
    return c.json<ApiResponse>({ success: false, message: "Tipe template wajib diisi (wakaf atau zakat)" }, 400);
  }

  if (!validateLayoutField(body.layoutField)) {
    const missing = getMissingLayoutFields(body.layoutField);
    return c.json<ApiResponse>({
      success: false,
      message: `LayoutField tidak lengkap. Field yang kurang: ${missing.join(", ")}`,
    }, 400);
  }

  const db = getDb();
  const [row] = await db
    .insert(templateSertifikat)
    .values({
      namaTemplate: body.namaTemplate.trim(),
      tipe: tipeValue as "wakaf" | "zakat",
      fileBackground: body.fileBackground.trim(),
      layoutField: body.layoutField,
      penandatangan1Id: body.penandatangan1Id ?? null,
      penandatangan2Id: body.penandatangan2Id ?? null,
      aktif: false,
    })
    .returning();

  return c.json<ApiResponse<typeof row>>(
    { success: true, message: "Template berhasil dibuat", data: row! },
    201
  );
});

// PATCH /template/:id/aktif (superadmin only)
// Deactivate all templates, then activate target — dalam satu transaksi DB
app.patch("/:id/aktif", requireRole(["superadmin"]), async (c) => {
  const id = Number(c.req.param("id"));
  if (isNaN(id)) {
    return c.json<ApiResponse>({ success: false, message: "ID tidak valid" }, 400);
  }

  const db = getDb();
  const existing = await db.query.templateSertifikat.findFirst({
    where: eq(templateSertifikat.id, id),
  });

  if (!existing) {
    return c.json<ApiResponse>({ success: false, message: "Template tidak ditemukan" }, 404);
  }

  await db.transaction(async (tx) => {
    // Hanya nonaktifkan template dengan tipe yang sama
    await tx.update(templateSertifikat)
      .set({ aktif: false })
      .where(eq(templateSertifikat.tipe, existing.tipe));
    // Aktifkan yang dipilih
    await tx
      .update(templateSertifikat)
      .set({ aktif: true })
      .where(eq(templateSertifikat.id, id));
  });

  // Optimasi: Gunakan SQL manual dengan regular LEFT JOIN
  const result = await db.execute(sql`
    SELECT
      t.id,
      t.nama_template,
      t.tipe,
      t.file_background,
      t.layout_field,
      t.penandatangan_1_id,
      t.penandatangan_2_id,
      t.aktif,
      p1.id as penandatangan1_id,
      p1.nama as penandatangan1_nama,
      p1.jabatan as penandatangan1_jabatan,
      p1.file_ttd as penandatangan1_file_ttd,
      p1.aktif as penandatangan1_aktif,
      p2.id as penandatangan2_id,
      p2.nama as penandatangan2_nama,
      p2.jabatan as penandatangan2_jabatan,
      p2.file_ttd as penandatangan2_file_ttd,
      p2.aktif as penandatangan2_aktif
    FROM template_sertifikat t
    LEFT JOIN penandatangan p1 ON t.penandatangan_1_id = p1.id
    LEFT JOIN penandatangan p2 ON t.penandatangan_2_id = p2.id
    WHERE t.id = ${id}
    LIMIT 1
  `);

  const t = result.rows[0] as any;
  const data: TemplateSertifikatDetail = {
    id: t.id,
    namaTemplate: t.nama_template,
    tipe: t.tipe,
    fileBackground: t.file_background,
    layoutField: t.layout_field as LayoutField,
    penandatangan1Id: t.penandatangan_1_id,
    penandatangan2Id: t.penandatangan_2_id,
    aktif: t.aktif,
    penandatangan1: t.penandatangan1_id ? {
      id: t.penandatangan1_id,
      nama: t.penandatangan1_nama,
      jabatan: t.penandatangan1_jabatan,
      fileTtd: t.penandatangan1_file_ttd,
      aktif: t.penandatangan1_aktif,
    } as any : null,
    penandatangan2: t.penandatangan2_id ? {
      id: t.penandatangan2_id,
      nama: t.penandatangan2_nama,
      jabatan: t.penandatangan2_jabatan,
      fileTtd: t.penandatangan2_file_ttd,
      aktif: t.penandatangan2_aktif,
    } as any : null,
  };

  return c.json<ApiResponse<TemplateSertifikatDetail>>({
    success: true,
    message: "Template berhasil diaktifkan",
    data,
  });
});

// PUT /template/:id (superadmin only) — update template yang sudah ada
app.put("/:id", requireRole(["superadmin"]), async (c) => {
  const id = Number(c.req.param("id"));
  if (isNaN(id)) {
    return c.json<ApiResponse>({ success: false, message: "ID tidak valid" }, 400);
  }

  const db = getDb();
  const existing = await db.query.templateSertifikat.findFirst({
    where: eq(templateSertifikat.id, id),
  });

  if (!existing) {
    return c.json<ApiResponse>({ success: false, message: "Template tidak ditemukan" }, 404);
  }

  const body = await c.req.json<Partial<BuatTemplateInput>>();

  if (body.namaTemplate !== undefined && body.namaTemplate.trim() === "") {
    return c.json<ApiResponse>({ success: false, message: "Nama template tidak boleh kosong" }, 400);
  }

  if (body.fileBackground !== undefined && body.fileBackground.trim() === "") {
    return c.json<ApiResponse>({ success: false, message: "File background tidak boleh kosong" }, 400);
  }

  if (body.layoutField !== undefined && !validateLayoutField(body.layoutField)) {
    const missing = getMissingLayoutFields(body.layoutField);
    return c.json<ApiResponse>({
      success: false,
      message: `LayoutField tidak lengkap. Field yang kurang: ${missing.join(", ")}`,
    }, 400);
  }

  const updateData: Partial<typeof existing> = {};
  if (body.namaTemplate !== undefined) updateData.namaTemplate = body.namaTemplate.trim();
  if (body.fileBackground !== undefined) updateData.fileBackground = body.fileBackground.trim();
  if (body.layoutField !== undefined) updateData.layoutField = body.layoutField;
  if (body.penandatangan1Id !== undefined) updateData.penandatangan1Id = body.penandatangan1Id ?? null;
  if (body.penandatangan2Id !== undefined) updateData.penandatangan2Id = body.penandatangan2Id ?? null;
  if ((body as any).tipe !== undefined) {
    (updateData as any).tipe = (body as any).tipe;
  }

  const [row] = await db
    .update(templateSertifikat)
    .set(updateData)
    .where(eq(templateSertifikat.id, id))
    .returning();

  return c.json<ApiResponse<typeof row>>(
    { success: true, message: "Template berhasil diperbarui", data: row! }
  );
});

export default app;
