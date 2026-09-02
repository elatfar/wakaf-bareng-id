import { Hono } from "hono";
import { eq, and, sql, like, count } from "drizzle-orm";
import { getDb } from "../db/client";
import { program, transaksi } from "../db/schema";
import { requireRole } from "../middleware/role";
import type { ApiResponse, Program, BuatProgramInput, ProgramStats, PaginatedData } from "shared";

const app = new Hono();

// GET /program?aktif=true&kategori=&search=&tipe=&page=1&limit=10
app.get("/", async (c) => {
  const aktifParam = c.req.query("aktif");
  const kategoriParam = c.req.query("kategori");
  const searchParam = c.req.query("search");
  const tipeParam = c.req.query("tipe");
  const page = Number(c.req.query("page")) || 1;
  const limit = Number(c.req.query("limit")) || 10;
  const db = getDb();
  const offset = (page - 1) * limit;

  const conditions = [];
  if (searchParam) {
    conditions.push(like(program.namaProgram, `%${searchParam}%`));
  }
  if (kategoriParam) {
    conditions.push(eq(program.kategori, kategoriParam));
  }
  if (tipeParam && ["wakaf", "zakat"].includes(tipeParam)) {
    conditions.push(eq(program.tipe, tipeParam as "wakaf" | "zakat"));
  }
  if (aktifParam === "true") {
    conditions.push(eq(program.aktif, true));
  } else if (aktifParam === "false") {
    conditions.push(eq(program.aktif, false));
  }

  let query = db.select().from(program) as any;
  let countQuery = db.select({ total: count() }).from(program) as any;

  if (conditions.length > 0) {
    query = query.where(and(...conditions));
    countQuery = db.select({ total: count() }).from(program).where(and(...conditions)) as any;
  }

  const rows = await query
    .orderBy(sql`${program.prioritas} DESC NULLS LAST, ${program.createdAt} DESC`)
    .limit(limit)
    .offset(offset);

  const countResult = await countQuery;
  const total = countResult[0]?.total ?? 0;
  const totalPages = Math.ceil(total / limit);

  // Convert numeric to number for JSON response
  const convertedRows = rows.map((row: any) => ({
    ...row,
    targetDana: row.targetDana ? Number(row.targetDana) : null,
    prioritas: row.prioritas ?? 0,
    createdAt: row.createdAt ? row.createdAt.toISOString() : null,
  }));

  return c.json<ApiResponse<PaginatedData<Program>>>({
    success: true,
    message: "OK",
    data: {
      data: convertedRows,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    },
  });
});

// GET /program/:id
app.get("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const db = getDb();
  const row = await db.query.program.findFirst({ where: eq(program.id, id) });
  if (!row) {
    return c.json<ApiResponse>({ success: false, message: "Program tidak ditemukan" }, 404);
  }
  
  const convertedRow = {
    ...row,
    targetDana: row.targetDana ? Number(row.targetDana) : null,
    prioritas: row.prioritas ?? 0,
    createdAt: row.createdAt ? row.createdAt.toISOString() : null,
  };
  
  return c.json<ApiResponse<Program>>({ success: true, message: "OK", data: convertedRow });
});

// GET /program/:id/statistik
app.get("/:id/statistik", async (c) => {
  const id = Number(c.req.param("id"));
  const db = getDb();
  
  const programData = await db.query.program.findFirst({ where: eq(program.id, id) });
  if (!programData) {
    return c.json<ApiResponse>({ success: false, message: "Program tidak ditemukan" }, 404);
  }

  // Calculate statistics from transaksi
  const transaksiList = await db.query.transaksi.findMany({
    where: eq(transaksi.programId, id),
  });

  const totalDonatur = transaksiList.length;
  const totalTerkumpul = transaksiList
    .filter(t => t.status === "terverifikasi")
    .reduce((sum, t) => sum + Number(t.jumlah), 0);
  
  const targetDana = programData.targetDana ? Number(programData.targetDana) : null;
  const progressPersen = targetDana && targetDana > 0 
    ? Math.min(100, (totalTerkumpul / targetDana) * 100) 
    : 0;

  const rataRataDonasi = totalDonatur > 0 
    ? totalTerkumpul / totalDonatur 
    : 0;

  const transaksiTerakhir = transaksiList.length > 0
    ? transaksiList.reduce((latest, t) => 
        (t.createdAt && latest && t.createdAt > latest) ? t.createdAt : latest, 
        transaksiList[0]?.createdAt ?? null
      )
    : null;

  const stats: ProgramStats = {
    programId: id,
    totalDonatur,
    totalTerkumpul,
    targetDana,
    progressPersen,
    transaksiTerakhir: transaksiTerakhir ? transaksiTerakhir.toISOString() : null,
    rataRataDonasi,
  };

  return c.json<ApiResponse<ProgramStats>>({ success: true, message: "OK", data: stats });
});

// GET /program/statistik/summary
app.get("/statistik/summary", async (c) => {
  const db = getDb();
  const programs = await db.query.program.findMany({
    where: eq(program.aktif, true),
  });

  const programStats = await Promise.all(
    programs.map(async (p) => {
      const transaksiList = await db.query.transaksi.findMany({
        where: eq(transaksi.programId, p.id),
      });

      const totalTerkumpul = transaksiList
        .filter(t => t.status === "terverifikasi")
        .reduce((sum, t) => sum + Number(t.jumlah), 0);

      return {
        id: p.id,
        namaProgram: p.namaProgram,
        targetDana: p.targetDana ? Number(p.targetDana) : null,
        totalTerkumpul,
        kategori: p.kategori,
      };
    })
  );

  const totalTarget = programStats.reduce((sum, p) => sum + (p.targetDana || 0), 0);
  const totalTerkumpulAll = programStats.reduce((sum, p) => sum + p.totalTerkumpul, 0);

  return c.json<ApiResponse>({
    success: true,
    message: "OK",
    data: {
      totalProgramAktif: programs.length,
      totalTarget,
      totalTerkumpul: totalTerkumpulAll,
      overallProgress: totalTarget > 0 ? (totalTerkumpulAll / totalTarget) * 100 : 0,
      programStats,
    },
  });
});

// POST /program (superadmin only)
app.post("/", requireRole(["superadmin"]), async (c) => {
  const body = await c.req.json<BuatProgramInput>();

  if (!body.namaProgram || body.namaProgram.trim() === "") {
    return c.json<ApiResponse>({ success: false, message: "Nama program wajib diisi" }, 400);
  }

  const tipeValue = body.tipe === "zakat" ? "zakat" : "wakaf";

  const db = getDb();
  const [row] = await db
    .insert(program)
    .values({
      namaProgram: body.namaProgram.trim(),
      tipe: tipeValue,
      deskripsi: body.deskripsi ?? null,
      targetDana: body.targetDana ? String(body.targetDana) : null,
      tanggalMulai: body.tanggalMulai ?? null,
      tanggalSelesai: body.tanggalSelesai ?? null,
      kategori: body.kategori ?? null,
      prioritas: body.prioritas ?? 0,
    })
    .returning();

  const convertedRow = row ? {
    ...row,
    targetDana: row.targetDana ? Number(row.targetDana) : null,
    prioritas: row.prioritas ?? 0,
    createdAt: row.createdAt ? row.createdAt.toISOString() : null,
  } : null;

  return c.json<ApiResponse<Program>>({ success: true, message: "Program berhasil dibuat", data: convertedRow! }, 201);
});

// PUT /program/:id (superadmin only) — update program
app.put("/:id", requireRole(["superadmin"]), async (c) => {
  const id = Number(c.req.param("id"));
  const body = await c.req.json<Partial<BuatProgramInput>>();

  const db = getDb();
  const existing = await db.query.program.findFirst({ where: eq(program.id, id) });
  if (!existing) {
    return c.json<ApiResponse>({ success: false, message: "Program tidak ditemukan" }, 404);
  }

  if (body.namaProgram !== undefined && body.namaProgram.trim() === "") {
    return c.json<ApiResponse>({ success: false, message: "Nama program wajib diisi" }, 400);
  }

  const updateData: any = {
    namaProgram: body.namaProgram?.trim() ?? existing.namaProgram,
    tipe: body.tipe ?? existing.tipe,
    deskripsi: body.deskripsi ?? existing.deskripsi,
    targetDana: body.targetDana !== undefined ? (body.targetDana ? String(body.targetDana) : null) : existing.targetDana,
    tanggalMulai: body.tanggalMulai ?? existing.tanggalMulai,
    tanggalSelesai: body.tanggalSelesai ?? existing.tanggalSelesai,
    kategori: body.kategori ?? existing.kategori,
    prioritas: body.prioritas ?? existing.prioritas,
  };

  const [row] = await db
    .update(program)
    .set(updateData)
    .where(eq(program.id, id))
    .returning();

  const convertedRow = row ? {
    ...row,
    targetDana: row.targetDana ? Number(row.targetDana) : null,
    prioritas: row.prioritas ?? 0,
    createdAt: row.createdAt ? row.createdAt.toISOString() : null,
  } : null;

  return c.json<ApiResponse<Program>>({ success: true, message: "Program berhasil diperbarui", data: convertedRow! });
});

// PATCH /program/:id (superadmin only) — toggle aktif
app.patch("/:id", requireRole(["superadmin"]), async (c) => {
  const id = Number(c.req.param("id"));
  const body = await c.req.json<{ aktif: boolean }>();

  const db = getDb();
  const existing = await db.query.program.findFirst({ where: eq(program.id, id) });
  if (!existing) {
    return c.json<ApiResponse>({ success: false, message: "Program tidak ditemukan" }, 404);
  }

  const [row] = await db
    .update(program)
    .set({ aktif: body.aktif })
    .where(eq(program.id, id))
    .returning();

  const convertedRow = row ? {
    ...row,
    targetDana: row.targetDana ? Number(row.targetDana) : null,
    prioritas: row.prioritas ?? 0,
    createdAt: row.createdAt ? row.createdAt.toISOString() : null,
  } : null;

  return c.json<ApiResponse<Program>>({ success: true, message: "Status program diperbarui", data: convertedRow! });
});

// POST /program/archive-expired — auto-archive expired programs
app.post("/archive-expired", requireRole(["superadmin"]), async (c) => {
  const db = getDb();
  const today = new Date();
  
  // Find programs that should be archived
  const allPrograms = await db.select().from(program);
  
  const expiredPrograms = allPrograms.filter(prog => 
    prog.aktif && 
    prog.tanggalSelesai && 
    new Date(prog.tanggalSelesai) < today
  );

  let archivedCount = 0;
  for (const prog of expiredPrograms) {
    await db
      .update(program)
      .set({ aktif: false })
      .where(eq(program.id, prog.id));
    archivedCount++;
  }

  return c.json<ApiResponse>({
    success: true,
    message: `${archivedCount} program berhasil diarsipkan`,
    data: { archivedCount, expiredPrograms: expiredPrograms.length },
  });
});

export default app;
