# Rancangan Aplikasi Sertifikat Wakaf — Stack BHVR (Bun + Hono + Vite + React)

## 1. Struktur Monorepo

Mengikuti pola resmi bhvr — `server` (Hono API), `client` (React/Vite), `shared` (tipe TypeScript dipakai bersama):

```
sertifikat-wakaf/
├── client/                      # React + Vite (form input, dashboard, preview sertifikat)
│   └── src/
│       ├── pages/
│       │   ├── DonaturPage.tsx
│       │   ├── TransaksiPage.tsx
│       │   ├── SertifikatPage.tsx
│       │   └── TemplateEditorPage.tsx
│       └── lib/api.ts           # fetch wrapper ke server, tipe dari `shared`
│
├── server/                      # Hono API + Drizzle ORM + generator PDF
│   └── src/
│       ├── db/
│       │   ├── schema.ts        # skema Drizzle (pengganti DDL SQL manual)
│       │   ├── client.ts        # koneksi db (bun:sqlite / postgres)
│       │   └── migrations/
│       ├── routes/
│       │   ├── donatur.ts
│       │   ├── transaksi.ts
│       │   ├── sertifikat.ts
│       │   └── template.ts
│       ├── lib/
│       │   ├── terbilang.ts     # angka -> teks
│       │   ├── nomor.ts         # generator no. transaksi/sertifikat
│       │   └── pdf.ts           # render sertifikat ke PDF
│       └── index.ts             # entry Hono app
│
└── shared/                      # Tipe & skema validasi dipakai client + server
    └── src/
        ├── types/
        │   ├── donatur.ts
        │   ├── transaksi.ts
        │   └── sertifikat.ts
        └── index.ts
```

**Kenapa ini cocok**: field di `shared/src/types` jadi satu-satunya sumber kebenaran bentuk data — dipakai untuk validasi di server (Hono) *dan* langsung dipakai sebagai tipe response di client, tanpa duplikasi interface atau generate client SDK terpisah.

---

## 2. Skema Database — Drizzle ORM (`server/src/db/schema.ts`)

Drizzle dipilih karena ringan, jalan native di Bun (`bun:sqlite` untuk dev/skala kecil, atau Postgres untuk produksi), dan tipenya otomatis nyambung ke `shared`.

```ts
// server/src/db/schema.ts
import { sql } from "drizzle-orm";
import {
  sqliteTable,
  text,
  integer,
  real,
} from "drizzle-orm/sqlite-core";

export const donatur = sqliteTable("donatur", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  nama: text("nama").notNull(),
  noHp: text("no_hp"),
  email: text("email"),
  alamat: text("alamat"),
  nik: text("nik"),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const program = sqliteTable("program", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  namaProgram: text("nama_program").notNull(), // "Wakaf Air Sehat"
  deskripsi: text("deskripsi"),
  aktif: integer("aktif", { mode: "boolean" }).default(true),
});

export const pengguna = sqliteTable("pengguna", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  nama: text("nama").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role", { enum: ["admin", "kasir", "superadmin"] }).default("admin"),
});

export const penandatangan = sqliteTable("penandatangan", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  nama: text("nama").notNull(),
  jabatan: text("jabatan").notNull(),      // "Ketua Yayasan Adab Insan Mulia"
  fileTtd: text("file_ttd"),               // path png transparan
  aktif: integer("aktif", { mode: "boolean" }).default(true),
});

export const templateSertifikat = sqliteTable("template_sertifikat", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  namaTemplate: text("nama_template").notNull(),
  fileBackground: text("file_background").notNull(),
  layoutField: text("layout_field", { mode: "json" }).notNull(), // koordinat tiap field
  penandatangan1Id: integer("penandatangan_1_id").references(() => penandatangan.id),
  penandatangan2Id: integer("penandatangan_2_id").references(() => penandatangan.id),
  aktif: integer("aktif", { mode: "boolean" }).default(true),
});

export const transaksi = sqliteTable("transaksi", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  noTransaksi: text("no_transaksi").notNull().unique(),   // TRX/2026/08/00001
  donaturId: integer("donatur_id").notNull().references(() => donatur.id),
  programId: integer("program_id").notNull().references(() => program.id),
  jenis: text("jenis", { enum: ["uang", "barang"] }).notNull(),
  deskripsiBarang: text("deskripsi_barang"),
  jumlah: real("jumlah").notNull(),
  jumlahTerbilang: text("jumlah_terbilang").notNull(),
  metodePembayaran: text("metode_pembayaran"),
  tanggal: text("tanggal").notNull(),
  status: text("status", { enum: ["pending", "terverifikasi", "batal"] }).default("terverifikasi"),
  dicatatOleh: integer("dicatat_oleh").references(() => pengguna.id),
  catatan: text("catatan"),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const sertifikat = sqliteTable("sertifikat", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  transaksiId: integer("transaksi_id").notNull().unique().references(() => transaksi.id),
  templateId: integer("template_id").notNull().references(() => templateSertifikat.id),
  noSertifikat: text("no_sertifikat").notNull().unique(), // CERT/2026/08/00001
  tanggalTerbit: text("tanggal_terbit").notNull(),
  filePath: text("file_path"),
  status: text("status", { enum: ["draft", "terbit", "dicetak", "dikirim"] }).default("terbit"),
  dikirimVia: text("dikirim_via"),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});
```

> **Produksi/skala besar**: ganti import dari `drizzle-orm/sqlite-core` ke `drizzle-orm/pg-core` (tabel jadi `pgTable`) dan pakai `postgres-js` sebagai driver — struktur kolom di atas tetap sama persis.

---

## 3. Tipe Bersama (`shared/src/types/`)

Ini yang bikin client & server "satu bahasa" tanpa perlu OpenAPI/generate ulang:

```ts
// shared/src/types/transaksi.ts
export interface Transaksi {
  id: number;
  noTransaksi: string;
  donaturId: number;
  programId: number;
  jenis: "uang" | "barang";
  deskripsiBarang?: string;
  jumlah: number;
  jumlahTerbilang: string;
  metodePembayaran?: string;
  tanggal: string;
  status: "pending" | "terverifikasi" | "batal";
}

export interface BuatTransaksiInput {
  donaturId: number;
  programId: number;
  jenis: "uang" | "barang";
  deskripsiBarang?: string;
  jumlah: number;
  metodePembayaran?: string;
}

// shared/src/types/sertifikat.ts
export interface Sertifikat {
  id: number;
  transaksiId: number;
  noSertifikat: string;
  tanggalTerbit: string;
  filePath: string | null;
  status: "draft" | "terbit" | "dicetak" | "dikirim";
}

// shared/src/index.ts
export * from "./types/transaksi";
export * from "./types/sertifikat";
export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
}
```

---

## 4. API Server — Hono (`server/src/routes/`)

```ts
// server/src/routes/transaksi.ts
import { Hono } from "hono";
import { db } from "../db/client";
import { transaksi } from "../db/schema";
import { generateNomor } from "../lib/nomor";
import { angkaKeTerbilang } from "../lib/terbilang";
import type { ApiResponse, Transaksi, BuatTransaksiInput } from "shared/dist";

const app = new Hono();

app.post("/", async (c) => {
  const body = await c.req.json<BuatTransaksiInput>();

  const noTransaksi = await generateNomor("TRX");
  const jumlahTerbilang = angkaKeTerbilang(body.jumlah) + " Rupiah";

  const [row] = await db.insert(transaksi).values({
    ...body,
    noTransaksi,
    jumlahTerbilang,
    tanggal: new Date().toISOString().slice(0, 10),
  }).returning();

  const res: ApiResponse<Transaksi> = {
    success: true,
    message: "Transaksi tersimpan",
    data: row as unknown as Transaksi,
  };
  return c.json(res, 201);
});

export default app;
```

```ts
// server/src/routes/sertifikat.ts
import { Hono } from "hono";
import { db } from "../db/client";
import { transaksi, sertifikat, templateSertifikat } from "../db/schema";
import { eq } from "drizzle-orm";
import { generateNomor } from "../lib/nomor";
import { renderSertifikatPDF } from "../lib/pdf";
import type { ApiResponse, Sertifikat } from "shared/dist";

const app = new Hono();

app.post("/generate/:transaksiId", async (c) => {
  const transaksiId = Number(c.req.param("transaksiId"));

  const trx = await db.query.transaksi.findFirst({ where: eq(transaksi.id, transaksiId) });
  if (!trx) return c.json({ success: false, message: "Transaksi tidak ditemukan" }, 404);

  const template = await db.query.templateSertifikat.findFirst({ where: eq(templateSertifikat.aktif, true) });
  if (!template) return c.json({ success: false, message: "Template belum diatur" }, 400);

  const noSertifikat = await generateNomor("CERT");
  const filePath = await renderSertifikatPDF(trx, template);

  const [row] = await db.insert(sertifikat).values({
    transaksiId,
    templateId: template.id,
    noSertifikat,
    tanggalTerbit: new Date().toISOString().slice(0, 10),
    filePath,
  }).returning();

  const res: ApiResponse<Sertifikat> = { success: true, message: "Sertifikat terbit", data: row as unknown as Sertifikat };
  return c.json(res, 201);
});

export default app;
```

```ts
// server/src/index.ts
import { Hono } from "hono";
import { cors } from "hono/cors";
import donatur from "./routes/donatur";
import transaksi from "./routes/transaksi";
import sertifikat from "./routes/sertifikat";
import template from "./routes/template";

const app = new Hono();
app.use(cors());

app.route("/donatur", donatur);
app.route("/transaksi", transaksi);
app.route("/sertifikat", sertifikat);
app.route("/template", template);

export default app;
```

---

## 5. Generate PDF Sertifikat (`server/src/lib/pdf.ts`)

Karena jalan di Bun, pakai `pdf-lib` (murni JS, tanpa dependensi native/Chromium) untuk menimpa teks di atas file desain sertifikat yang sudah ada:

```ts
// server/src/lib/pdf.ts
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import fs from "node:fs/promises";

export async function renderSertifikatPDF(trx: any, template: any) {
  const bgBytes = await fs.readFile(template.fileBackground); // PDF/PNG kosong
  const pdfDoc = await PDFDocument.load(bgBytes);
  const page = pdfDoc.getPages()[0];
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const layout = JSON.parse(template.layoutField);

  page.drawText(trx.namaDonatur, {
    x: layout.namaDonatur.x,
    y: layout.namaDonatur.y,
    size: layout.namaDonatur.size,
    font,
    color: rgb(0, 0, 0),
  });

  page.drawText(trx.jumlahTerbilang, {
    x: layout.jumlahTerbilang.x,
    y: layout.jumlahTerbilang.y,
    size: layout.jumlahTerbilang.size,
    font,
  });

  const outPath = `storage/sertifikat/${trx.noTransaksi}.pdf`;
  await fs.writeFile(outPath, await pdfDoc.save());
  return outPath;
}
```

---

## 6. Client — React (`client/src/pages/SertifikatPage.tsx`)

```tsx
import { useState } from "react";
import type { ApiResponse, Sertifikat } from "shared";

const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:3000";

export default function SertifikatPage({ transaksiId }: { transaksiId: number }) {
  const [sertifikat, setSertifikat] = useState<Sertifikat>();
  const [loading, setLoading] = useState(false);

  async function buatSertifikat() {
    setLoading(true);
    const req = await fetch(`${SERVER_URL}/sertifikat/generate/${transaksiId}`, { method: "POST" });
    const res: ApiResponse<Sertifikat> = await req.json();
    if (res.success && res.data) setSertifikat(res.data);
    setLoading(false);
  }

  return (
    <div>
      <button onClick={buatSertifikat} disabled={loading}>
        {loading ? "Memproses..." : "Buat Sertifikat"}
      </button>
      {sertifikat && (
        <a href={`${SERVER_URL}/${sertifikat.filePath}`} target="_blank">
          Lihat Sertifikat {sertifikat.noSertifikat}
        </a>
      )}
    </div>
  );
}
```

---

## 7. Relasi Tabel (tidak berubah dari sebelumnya)

Relasinya sama seperti diagram ERD sebelumnya — yang berubah hanya cara mendefinisikannya (Drizzle TS schema, bukan DDL SQL mentah) dan cara diakses (lewat Hono routes + tipe `shared`, bukan query manual).

## 8. Menjalankan Proyek

```bash
bun create bhvr@latest sertifikat-wakaf
cd sertifikat-wakaf
bun add drizzle-orm pdf-lib
bun add -d drizzle-kit
bun run dev   # jalankan client, server, shared sekaligus
```

## 9. Catatan Migrasi dari Rancangan Sebelumnya

| Sebelumnya | Sekarang (BHVR) |
|---|---|
| DDL SQL manual | Drizzle schema (`schema.ts`), migrasi via `drizzle-kit` |
| Backend generik (Laravel/Express) | Hono di atas Bun runtime |
| Tipe request/response didefinisikan ulang di frontend | Satu sumber di `shared/src/types`, dipakai langsung client & server |
| PDF render via Puppeteer/TCPDF | `pdf-lib` (ringan, jalan native di Bun tanpa Chromium) |