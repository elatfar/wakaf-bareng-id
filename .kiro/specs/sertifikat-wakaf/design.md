# Technical Design — Sertifikat Wakaf

## Overview

Sertifikat Wakaf adalah aplikasi manajemen wakaf berbasis web untuk Yayasan Adab Insan Mulia. Aplikasi memungkinkan operator (admin/kasir) mencatat donatur, membuat transaksi wakaf, dan menerbitkan sertifikat wakaf PDF secara otomatis dari data transaksi.

Sistem dibangun menggunakan stack BHVR (Bun + Hono + Vite + React) dalam monorepo Turborepo dengan tiga package: `server`, `client`, dan `shared`. Database menggunakan Neon PostgreSQL di semua environment, diakses via `postgres-js` + Drizzle ORM.

### Tujuan Teknis Utama

- PDF sertifikat digenerate server-side menggunakan `pdf-lib` dengan background PNG yang sudah didesain
- Nomor transaksi dan sertifikat unik, berurutan, dan aman terhadap race condition (menggunakan `SELECT ... FOR UPDATE` atau counter atomik di database)
- Satu sumber kebenaran untuk struktur data: tipe di `shared/` dipakai langsung di server dan client
- Role-based access control (superadmin, admin, kasir) di semua endpoint

---

## Architecture

### Gambaran Umum

```
┌─────────────────────────────────────────────────┐
│                  Browser (Client)                │
│  React + Vite + TanStack Query + Hono RPC client │
│  DonaturPage │ TransaksiPage │ SertifikatPage    │
│  TemplateEditorPage                              │
└───────────────────┬─────────────────────────────┘
                    │ HTTP/JSON  (Hono RPC)
┌───────────────────▼─────────────────────────────┐
│                  API Server (Hono on Bun)         │
│                                                  │
│  Auth Middleware ──► Role Guard Middleware        │
│                                                  │
│  /auth/*        /donatur/*    /pengguna/*         │
│  /program/*     /transaksi/*  /sertifikat/*       │
│  /template/*    /penandatangan/*                 │
│                                                  │
│  lib/terbilang.ts   lib/nomor.ts   lib/pdf.ts     │
└───────────────────┬─────────────────────────────┘
                    │ Drizzle ORM (postgres-js)
┌───────────────────▼─────────────────────────────┐
│              Neon PostgreSQL                      │
│  donatur │ program │ pengguna │ penandatangan     │
│  template_sertifikat │ transaksi │ sertifikat     │
└─────────────────────────────────────────────────┘
                    │ fs (Bun)
┌───────────────────▼─────────────────────────────┐
│          Local File System (storage/)             │
│  storage/sertifikat/[noTransaksi].pdf             │
│  storage/backgrounds/BG-Sertifikat.png            │
│  storage/ttd/[penandatangan_id].png               │
└─────────────────────────────────────────────────┘
```

### Struktur Direktori

```
wakaf-bareng-id/
├── client/
│   └── src/
│       ├── pages/
│       │   ├── DonaturPage.tsx
│       │   ├── TransaksiPage.tsx
│       │   ├── SertifikatPage.tsx
│       │   └── TemplateEditorPage.tsx
│       ├── components/
│       │   ├── DonaturForm.tsx
│       │   ├── TransaksiForm.tsx
│       │   └── SertifikatCard.tsx
│       └── lib/
│           └── api.ts          # hcWithType wrapper
│
├── server/
│   └── src/
│       ├── db/
│       │   ├── schema.ts       # Drizzle pgTable schema
│       │   ├── client.ts       # postgres-js + drizzle connection
│       │   └── migrations/
│       ├── routes/
│       │   ├── auth.ts
│       │   ├── donatur.ts
│       │   ├── program.ts
│       │   ├── pengguna.ts
│       │   ├── penandatangan.ts
│       │   ├── transaksi.ts
│       │   ├── sertifikat.ts
│       │   └── template.ts
│       ├── middleware/
│       │   ├── auth.ts         # JWT session verification
│       │   └── role.ts         # role guard factory
│       ├── lib/
│       │   ├── terbilang.ts    # angka → teks Bahasa Indonesia
│       │   ├── nomor.ts        # nomor sekuensial generator
│       │   └── pdf.ts          # pdf-lib renderer
│       └── index.ts
│
├── shared/
│   └── src/
│       ├── types/
│       │   ├── donatur.ts
│       │   ├── program.ts
│       │   ├── pengguna.ts
│       │   ├── penandatangan.ts
│       │   ├── transaksi.ts
│       │   ├── sertifikat.ts
│       │   └── template.ts
│       └── index.ts
│
└── storage/                    # file storage (gitignored)
    ├── sertifikat/
    ├── backgrounds/
    └── ttd/
```

### Alur Request Utama: Generate Sertifikat

```
POST /sertifikat/generate/:transaksiId
       │
       ▼
  Auth Middleware (verifikasi JWT)
       │
       ▼
  Role Guard (admin/superadmin only)
       │
       ▼
  Validasi: transaksi exist + status = "terverifikasi"
       │
       ▼
  Validasi: template aktif ada
       │
       ▼
  Cek duplikasi: transaksi belum punya sertifikat (UNIQUE constraint)
       │
       ▼
  generateNomor("CERT")  ◄── DB transaction dengan FOR UPDATE
       │
       ▼
  renderSertifikatPDF()  ◄── pdf-lib: embed PNG + draw text
       │
       ▼
  fs.writeFile(storage/sertifikat/[noTransaksi].pdf)
       │
       ▼
  db.insert(sertifikat)  ◄── simpan record + filePath
       │
       ▼
  return ApiResponse<Sertifikat> 201
```

---

## Components and Interfaces

### Shared Types (`shared/src/types/`)

```typescript
// shared/src/types/index.ts (ApiResponse generic)
export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
}

// shared/src/types/donatur.ts
export interface Donatur {
  id: number;
  nama: string;
  noHp: string | null;
  email: string | null;
  alamat: string | null;
  nik: string | null;
  createdAt: string;
}

export interface BuatDonaturInput {
  nama: string;
  noHp?: string;
  email?: string;
  alamat?: string;
  nik?: string;
}

// shared/src/types/program.ts
export interface Program {
  id: number;
  namaProgram: string;
  deskripsi: string | null;
  aktif: boolean;
}

export interface BuatProgramInput {
  namaProgram: string;
  deskripsi?: string;
}

// shared/src/types/pengguna.ts
export type Role = "superadmin" | "admin" | "kasir";

export interface Pengguna {
  id: number;
  nama: string;
  email: string;
  role: Role;
}

export interface BuatPenggunaInput {
  nama: string;
  email: string;
  password: string;
  role: Role;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  pengguna: Pengguna;
}

// shared/src/types/penandatangan.ts
export interface Penandatangan {
  id: number;
  nama: string;
  jabatan: string;
  fileTtd: string | null;
  aktif: boolean;
}

export interface BuatPenandatanganInput {
  nama: string;
  jabatan: string;
  fileTtd?: string;
}

// shared/src/types/transaksi.ts
export interface Transaksi {
  id: number;
  noTransaksi: string;
  donaturId: number;
  programId: number;
  jenis: "uang" | "barang";
  deskripsiBarang: string | null;
  jumlah: number;
  jumlahTerbilang: string;
  metodePembayaran: string | null;
  tanggal: string;
  status: "pending" | "terverifikasi" | "batal";
  catatan: string | null;
  createdAt: string;
}

export interface TransaksiDetail extends Transaksi {
  donatur: Pick<Donatur, "id" | "nama" | "noHp">;
  program: Pick<Program, "id" | "namaProgram">;
}

export interface BuatTransaksiInput {
  donaturId: number;
  programId: number;
  jenis: "uang" | "barang";
  deskripsiBarang?: string;
  jumlah: number;
  metodePembayaran?: string;
  tanggal?: string;
  catatan?: string;
}

// shared/src/types/sertifikat.ts
export interface Sertifikat {
  id: number;
  transaksiId: number;
  templateId: number;
  noSertifikat: string;
  tanggalTerbit: string;
  filePath: string | null;
  status: "draft" | "terbit" | "dicetak" | "dikirim";
  dikirimVia: string | null;
  createdAt: string;
}

export interface SertifikatDetail extends Sertifikat {
  transaksi: TransaksiDetail;
}

// shared/src/types/template.ts
export interface LayoutFieldItem {
  x: number;
  y: number;
  size: number;
  align: "left" | "center" | "right";
  bold: boolean;
}

export interface LayoutField {
  namaDonatur: LayoutFieldItem;
  deskripsiWakaf: LayoutFieldItem;
  jumlahTerbilang: LayoutFieldItem;
  noSertifikat: LayoutFieldItem;
  tanggalTerbit: LayoutFieldItem;
  canvasWidth: number;
  canvasHeight: number;
}

export interface TemplateSertifikat {
  id: number;
  namaTemplate: string;
  fileBackground: string;
  layoutField: LayoutField;
  penandatangan1Id: number | null;
  penandatangan2Id: number | null;
  aktif: boolean;
}

export interface TemplateSertifikatDetail extends TemplateSertifikat {
  penandatangan1: Penandatangan | null;
  penandatangan2: Penandatangan | null;
}

export interface BuatTemplateInput {
  namaTemplate: string;
  fileBackground: string;
  layoutField: LayoutField;
  penandatangan1Id?: number;
  penandatangan2Id?: number;
}
```

### Server — Middleware

```typescript
// server/src/middleware/auth.ts
// Memverifikasi JWT Bearer token dari header Authorization
// Menyimpan data pengguna di c.set("pengguna", payload)
// Mengembalikan 401 jika token tidak ada atau tidak valid

// server/src/middleware/role.ts
// requireRole(roles: Role[]) → Hono MiddlewareHandler
// Mengambil pengguna dari context, cek role
// Mengembalikan 403 jika role tidak sesuai
```

### Server — Library Modules

**`lib/terbilang.ts`** — Pure function, no side effects:
```typescript
export function angkaKeTerbilang(n: number): string
// Input: integer positif 0 – 999_999_999_999
// Output: string Title Case, diakhiri " Rupiah"
// Throws: RangeError jika n < 0, n > 999_999_999_999, atau bukan integer
```

**`lib/nomor.ts`** — Database-dependent, concurrency-safe:
```typescript
export async function generateNomor(
  prefix: "TRX" | "CERT",
  db: DrizzleDb
): Promise<string>
// Menggunakan advisory lock atau SELECT COUNT + FOR UPDATE di dalam transaksi DB
// Output format: "TRX/2026/08/00001" atau "CERT/2026/08/00001"
// Counter di-reset setiap ganti bulan
```

**`lib/pdf.ts`** — File I/O + pdf-lib:
```typescript
export async function renderSertifikatPDF(
  data: RenderData,
  template: TemplateSertifikat
): Promise<string>  // returns filePath

interface RenderData {
  noTransaksi: string;
  noSertifikat: string;
  namaDonatur: string;
  namaProgram: string;
  jenis: "uang" | "barang";
  jumlahTerbilang: string;
  tanggalTerbit: string; // ISO date string
}
```

### Client — Pages dan Data Fetching

Client menggunakan Hono RPC client (`hcWithType`) untuk type-safe fetching. TanStack Query digunakan untuk semua server state.

```typescript
// client/src/lib/api.ts
const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:3000";
export const client = hcWithType(SERVER_URL);
```

Setiap halaman menggunakan pola:
- `useQuery` untuk fetching data list/detail
- `useMutation` untuk POST/PATCH/DELETE
- Loading state dari `mutation.isPending` untuk disable tombol
- Error state dari `mutation.isError` untuk tampilkan pesan error

---

## Data Models

### Database Schema (Drizzle ORM — `server/src/db/schema.ts`)

Menggunakan `drizzle-orm/pg-core` dengan `pgTable` untuk Neon PostgreSQL:

```typescript
import { sql } from "drizzle-orm";
import {
  pgTable,
  serial,
  text,
  boolean,
  numeric,
  integer,
  timestamp,
  uniqueIndex,
  jsonb,
  pgEnum,
} from "drizzle-orm/pg-core";

// === Enums ===
export const roleEnum = pgEnum("role", ["superadmin", "admin", "kasir"]);
export const jenisWakafEnum = pgEnum("jenis_wakaf", ["uang", "barang"]);
export const statusTransaksiEnum = pgEnum("status_transaksi", ["pending", "terverifikasi", "batal"]);
export const statusSertifikatEnum = pgEnum("status_sertifikat", ["draft", "terbit", "dicetak", "dikirim"]);

// === Tables ===
export const donatur = pgTable("donatur", {
  id: serial("id").primaryKey(),
  nama: text("nama").notNull(),
  noHp: text("no_hp"),
  email: text("email"),
  alamat: text("alamat"),
  nik: text("nik"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const program = pgTable("program", {
  id: serial("id").primaryKey(),
  namaProgram: text("nama_program").notNull(),
  deskripsi: text("deskripsi"),
  aktif: boolean("aktif").notNull().default(true),
});

export const pengguna = pgTable("pengguna", {
  id: serial("id").primaryKey(),
  nama: text("nama").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: roleEnum("role").notNull().default("admin"),
});

export const penandatangan = pgTable("penandatangan", {
  id: serial("id").primaryKey(),
  nama: text("nama").notNull(),
  jabatan: text("jabatan").notNull(),
  fileTtd: text("file_ttd"),
  aktif: boolean("aktif").notNull().default(true),
});

export const templateSertifikat = pgTable("template_sertifikat", {
  id: serial("id").primaryKey(),
  namaTemplate: text("nama_template").notNull(),
  fileBackground: text("file_background").notNull(),
  layoutField: jsonb("layout_field").notNull().$type<LayoutField>(),
  penandatangan1Id: integer("penandatangan_1_id").references(
    () => penandatangan.id
  ),
  penandatangan2Id: integer("penandatangan_2_id").references(
    () => penandatangan.id
  ),
  aktif: boolean("aktif").notNull().default(false),
});

export const transaksi = pgTable("transaksi", {
  id: serial("id").primaryKey(),
  noTransaksi: text("no_transaksi").notNull().unique(),
  donaturId: integer("donatur_id")
    .notNull()
    .references(() => donatur.id),
  programId: integer("program_id")
    .notNull()
    .references(() => program.id),
  jenis: jenisWakafEnum("jenis").notNull(),
  deskripsiBarang: text("deskripsi_barang"),
  jumlah: numeric("jumlah", { precision: 15, scale: 2 }).notNull(),
  jumlahTerbilang: text("jumlah_terbilang").notNull(),
  metodePembayaran: text("metode_pembayaran"),
  tanggal: text("tanggal").notNull(),
  status: statusTransaksiEnum("status").notNull().default("terverifikasi"),
  dicatatOleh: integer("dicatat_oleh").references(() => pengguna.id),
  catatan: text("catatan"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const sertifikat = pgTable("sertifikat", {
  id: serial("id").primaryKey(),
  transaksiId: integer("transaksi_id")
    .notNull()
    .unique()
    .references(() => transaksi.id),
  templateId: integer("template_id")
    .notNull()
    .references(() => templateSertifikat.id),
  noSertifikat: text("no_sertifikat").notNull().unique(),
  tanggalTerbit: text("tanggal_terbit").notNull(),
  filePath: text("file_path"),
  status: statusSertifikatEnum("status").notNull().default("terbit"),
  dikirimVia: text("dikirim_via"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
```

### Database Connection (`server/src/db/client.ts`)

```typescript
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL!;
const sql = postgres(connectionString, { max: 10 });
export const db = drizzle(sql, { schema });
export type DrizzleDb = typeof db;
```

### ERD

```
donatur (1) ──────────────── (N) transaksi
program (1) ──────────────── (N) transaksi
pengguna (1) ─────────────── (N) transaksi (dicatat_oleh)
transaksi (1) ────────────── (1) sertifikat
templateSertifikat (1) ────── (N) sertifikat
penandatangan (1) ────────── (N) templateSertifikat (penandatangan_1_id)
penandatangan (1) ────────── (N) templateSertifikat (penandatangan_2_id)
```

### Layout Field JSON (Sertifikat 2000×1414px)

Disimpan di kolom `layout_field` (JSONB) pada tabel `template_sertifikat`:

```json
{
  "namaDonatur":    { "x": 1000, "y": 720,  "size": 58, "align": "center", "bold": true  },
  "deskripsiWakaf": { "x": 1000, "y": 900,  "size": 36, "align": "center", "bold": false },
  "jumlahTerbilang":{ "x": 1000, "y": 955,  "size": 34, "align": "center", "bold": true  },
  "noSertifikat":   { "x": 1820, "y": 1345, "size": 22, "align": "right",  "bold": false },
  "tanggalTerbit":  { "x": 1820, "y": 1375, "size": 22, "align": "right",  "bold": false },
  "canvasWidth": 2000,
  "canvasHeight": 1414
}
```

Koordinat menggunakan origin **kiri-atas** (sistem layout HTML/gambar). `PDF_Generator` mengonversi ke origin kiri-bawah (pdf-lib) dengan formula: `y_pdf = canvasHeight - y_layout`.

### Nomor Sequence (Concurrency Safety)

Untuk menghindari race condition pada `generateNomor`, implementasi menggunakan PostgreSQL advisory lock:

```sql
-- Dalam satu transaksi DB:
SELECT pg_advisory_xact_lock(hashtext('nomor_generator_' || prefix || '_' || month_key));
SELECT COUNT(*) FROM [table] WHERE no_[prefix] LIKE 'PREFIX/YYYY/MM/%';
-- Hasilkan nomor = COUNT + 1
-- INSERT record
-- Lock otomatis dilepas saat transaksi selesai
```

---

## Correctness Properties

*A property adalah karakteristik atau perilaku yang harus berlaku di semua eksekusi valid sistem — secara formal, pernyataan tentang apa yang harus dilakukan sistem. Properties menjembatani spesifikasi yang bisa dibaca manusia dengan jaminan kebenaran yang bisa diverifikasi mesin.*

### Property 1: Terbilang round-trip

*Untuk semua* angka bulat positif `n` dalam rentang 1 hingga 999.999.999.999, mengonversi `n` ke teks terbilang lalu memparse teks tersebut kembali ke angka harus menghasilkan nilai yang sama dengan `n`.

**Validates: Requirements 10.6, 10.1, 10.3**

### Property 2: Terbilang menolak input invalid

*Untuk semua* input yang bernilai negatif, bukan integer, atau melebihi 999.999.999.999, fungsi `angkaKeTerbilang` harus melempar error.

**Validates: Requirements 10.4**

### Property 3: Terbilang output Title Case dan berakhir "Rupiah"

*Untuk semua* angka bulat positif `n` yang valid, output `angkaKeTerbilang(n)` harus berakhir dengan kata " Rupiah" dan setiap kata dimulai dengan huruf kapital.

**Validates: Requirements 10.1, 10.5**

### Property 4: Format nomor sekuensial valid

*Untuk semua* pemanggilan `generateNomor("TRX")` atau `generateNomor("CERT")`, output harus sesuai format `PREFIX/YYYY/MM/NNNNN` di mana NNNNN adalah 5 digit dengan padding nol.

**Validates: Requirements 9.1, 9.3, 4.2, 5.4**

### Property 5: Keunikan nomor sekuensial dalam satu bulan

*Untuk semua* kumpulan N pemanggilan `generateNomor` untuk prefix dan bulan yang sama, tidak boleh ada dua nomor yang sama di antara hasil yang dihasilkan.

**Validates: Requirements 9.4, 4.10, 5.13**

### Property 6: Koordinat y PDF terflip dengan benar

*Untuk semua* nilai `y_layout` pada rentang `[0, canvasHeight]`, hasil transformasi `y_pdf = canvasHeight - y_layout` harus berada dalam rentang `[0, canvasHeight]` dan `y_pdf + y_layout === canvasHeight`.

**Validates: Requirements 5.6**

### Property 7: Alignment tengah menghasilkan teks terpusat

*Untuk semua* teks dan ukuran font yang valid, `x_draw` yang dihasilkan oleh fungsi centerX harus memenuhi `x_draw + textWidth/2 === x_center`.

**Validates: Requirements 5.7**

### Property 8: Alignment kanan menghasilkan ujung kanan di koordinat yang tepat

*Untuk semua* teks dan ukuran font yang valid, `x_draw` yang dihasilkan oleh fungsi rightAlignX harus memenuhi `x_draw + textWidth === x_right`.

**Validates: Requirements 5.8**

### Property 9: Validasi nama donatur — whitespace ditolak

*Untuk semua* string yang hanya berisi whitespace atau string kosong sebagai nilai `nama` donatur, server harus mengembalikan HTTP 400.

**Validates: Requirements 1.2**

### Property 10: Validasi deskripsi barang — whitespace ditolak

*Untuk semua* transaksi dengan `jenis = "barang"` di mana `deskripsiBarang` berisi hanya whitespace atau kosong, server harus mengembalikan HTTP 400.

**Validates: Requirements 4.7**

### Property 11: Hanya satu template aktif pada satu waktu

*Untuk semua* operasi aktivasi template, setelah operasi selesai COUNT(template_sertifikat WHERE aktif = true) harus selalu ≤ 1.

**Validates: Requirements 6.3, 6.4**

### Property 12: Duplikasi sertifikat dicegah

*Untuk semua* transaksiId yang sudah memiliki sertifikat terbit di database, permintaan generate sertifikat kedua dengan transaksiId yang sama harus menghasilkan HTTP 409.

**Validates: Requirements 5.12**

### Property 13: Password tersimpan sebagai hash, bukan plaintext

*Untuk semua* pengguna yang dibuat melalui `POST /pengguna` dengan password apapun, nilai `passwordHash` yang tersimpan di database tidak boleh sama dengan password aslinya.

**Validates: Requirements 3.7**

### Property 14: Filter program aktif bersifat eksklusif

*Untuk semua* kondisi database (campuran program aktif dan tidak aktif), endpoint `GET /program?aktif=true` harus hanya mengembalikan program dengan `aktif = true` dan tidak pernah mengembalikan program dengan `aktif = false`.

**Validates: Requirements 2.4**

---

## Error Handling

### Strategi Error Umum

Semua endpoint mengembalikan `ApiResponse` dengan format konsisten:

```typescript
// Success
{ success: true, message: string, data: T }

// Error
{ success: false, message: string }
```

### Tabel Error per Kondisi

| Kondisi | HTTP Status | Pesan |
|---|---|---|
| Token tidak ada / tidak valid | 401 | "Token tidak valid atau sudah kedaluwarsa" |
| Role tidak mencukupi | 403 | "Akses ditolak" |
| Email/password salah saat login | 401 | "Email atau kata sandi salah" |
| Resource tidak ditemukan | 404 | "[Resource] tidak ditemukan" |
| Validasi input gagal | 400 | Daftar field yang tidak valid |
| Konflik duplikasi | 409 | "Sertifikat untuk transaksi ini sudah pernah diterbitkan" |
| Penghapusan terblokir (ada relasi) | 409 | "Donatur memiliki transaksi terkait dan tidak dapat dihapus" |
| Template tidak aktif | 400 | "Template sertifikat belum diatur" |
| Program tidak aktif | 400 | "Program tidak aktif" |
| File PDF tidak ditemukan | 404 | "File sertifikat tidak ditemukan" |
| Server error | 500 | "Terjadi kesalahan pada server" |

### Error Handling di PDF Generator

Jika `renderSertifikatPDF` gagal (misal background file tidak ditemukan, disk penuh), error harus dilempar sebelum `db.insert(sertifikat)` sehingga tidak ada record sertifikat yang tersimpan tanpa file PDF. Gunakan pola:

```typescript
// Urutan: generate PDF dulu, baru insert ke DB
const filePath = await renderSertifikatPDF(data, template); // dapat throw
const [row] = await db.insert(sertifikat).values({ ..., filePath }).returning();
```

### Error Handling di Client

- Semua error dari server ditampilkan sebagai pesan user-friendly (tanpa stack trace)
- TanStack Query `onError` callback menampilkan `error.message` dari `ApiResponse`
- Tombol aksi di-disable selama `mutation.isPending`
- Tidak ada detail teknis internal yang ditampilkan ke pengguna

---

## Testing Strategy

### Pendekatan Dual-Layer

Pengujian menggunakan dua lapisan yang saling melengkapi:

1. **Unit tests** — logika murni tanpa I/O (fungsi `terbilang`, `nomor` format, transformasi koordinat PDF)
2. **Integration tests** — endpoint Hono dengan database test (Neon branch atau in-process PostgreSQL)

Property-based testing diterapkan pada modul yang memiliki logika murni dengan ruang input besar.

### Stack Testing

- **Test runner**: Bun built-in test (`bun:test`)
- **Property-based testing**: `fast-check` untuk property tests
- **Database**: Neon branching untuk integration tests terisolasi
- **Coverage target**: fungsi lib 100%, route handlers kritis 80%+

### Unit Tests — `lib/terbilang.ts`

Test menggunakan `fast-check` dengan minimum 1000 iterasi:

```typescript
// server/src/lib/terbilang.test.ts

// Feature: sertifikat-wakaf, Property 1: Terbilang round-trip
test("round-trip: terbilang kemudian parse menghasilkan nilai asli", () => {
  fc.assert(
    fc.property(
      fc.integer({ min: 1, max: 999_999_999_999 }),
      (n) => {
        const teks = angkaKeTerbilang(n);
        const kembali = parseTerbilang(teks); // helper parser inverse
        expect(kembali).toBe(n);
      }
    ),
    { numRuns: 1000 }
  );
});

// Feature: sertifikat-wakaf, Property 2: Terbilang menolak input invalid
test("throws untuk input invalid", () => {
  fc.assert(
    fc.property(
      fc.oneof(
        fc.integer({ max: -1 }),
        fc.float({ noNaN: false }).filter(n => !Number.isInteger(n)),
        fc.constant(1_000_000_000_000)
      ),
      (n) => {
        expect(() => angkaKeTerbilang(n)).toThrow();
      }
    )
  );
});

// Feature: sertifikat-wakaf, Property 3: Terbilang output Title Case dan berakhir "Rupiah"
test("output Title Case dan berakhir dengan 'Rupiah'", () => {
  fc.assert(
    fc.property(
      fc.integer({ min: 0, max: 999_999_999_999 }),
      (n) => {
        const teks = angkaKeTerbilang(n);
        expect(teks.endsWith(" Rupiah") || teks === "Nol Rupiah").toBe(true);
        // setiap kata dimulai kapital
        teks.split(" ").forEach(kata => {
          expect(kata[0]).toBe(kata[0].toUpperCase());
        });
      }
    )
  );
});
```

### Unit Tests — `lib/pdf.ts` (transformasi koordinat)

```typescript
// server/src/lib/pdf.test.ts

// Feature: sertifikat-wakaf, Property 6: Koordinat y PDF terflip dengan benar
test("y flip: y_pdf + y_layout === canvasHeight", () => {
  fc.assert(
    fc.property(
      fc.integer({ min: 0, max: 1414 }), // y_layout
      (yLayout) => {
        const canvasHeight = 1414;
        const yPdf = canvasHeight - yLayout;
        expect(yPdf + yLayout).toBe(canvasHeight);
        expect(yPdf).toBeGreaterThanOrEqual(0);
        expect(yPdf).toBeLessThanOrEqual(canvasHeight);
      }
    )
  );
});

// Feature: sertifikat-wakaf, Property 7: Alignment tengah
test("centerX: x_draw + textWidth/2 === x_center", () => {
  fc.assert(
    fc.property(
      fc.integer({ min: 1, max: 500 }),  // textWidth
      fc.integer({ min: 0, max: 2000 }), // x_center
      (textWidth, xCenter) => {
        const xDraw = xCenter - textWidth / 2;
        expect(xDraw + textWidth / 2).toBe(xCenter);
      }
    )
  );
});

// Feature: sertifikat-wakaf, Property 8: Alignment kanan
test("rightAlignX: x_draw + textWidth === x_right", () => {
  fc.assert(
    fc.property(
      fc.integer({ min: 1, max: 500 }),  // textWidth
      fc.integer({ min: 0, max: 2000 }), // x_right
      (textWidth, xRight) => {
        const xDraw = xRight - textWidth;
        expect(xDraw + textWidth).toBe(xRight);
      }
    )
  );
});
```

### Unit Tests — `lib/nomor.ts`

```typescript
// server/src/lib/nomor.test.ts

// Feature: sertifikat-wakaf, Property 4: Format nomor sekuensial valid
test("format nomor match regex PREFIX/YYYY/MM/NNNNN", () => {
  const regex = /^(TRX|CERT)\/\d{4}\/\d{2}\/\d{5}$/;
  // Test dengan berbagai tahun/bulan/urutan
  expect("TRX/2026/08/00001").toMatch(regex);
  expect("CERT/2026/12/00100").toMatch(regex);
  expect(buildNomorString("TRX", 2026, 8, 1)).toMatch(regex);
  // Property: urutan ke-N menghasilkan string dengan NNNNN = N (zero-padded)
  fc.assert(
    fc.property(
      fc.integer({ min: 1, max: 99999 }),
      (n) => {
        const nomor = buildNomorString("TRX", 2026, 8, n);
        const parts = nomor.split("/");
        expect(parts[3]).toBe(n.toString().padStart(5, "0"));
      }
    )
  );
});
```

### Integration Tests — Endpoints

Menggunakan Neon branch terisolasi per test suite atau `postgres.js` test connection:

```typescript
// Contoh integration test untuk validasi

// Feature: sertifikat-wakaf, Property 9: Validasi nama donatur
test("POST /donatur menolak nama whitespace-only", async () => {
  fc.assert(
    fc.property(
      fc.string().filter(s => s.trim() === ""), // whitespace-only strings
      async (namaKosong) => {
        const res = await app.request("/donatur", {
          method: "POST",
          body: JSON.stringify({ nama: namaKosong }),
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${adminToken}` },
        });
        expect(res.status).toBe(400);
      }
    )
  );
});

// Feature: sertifikat-wakaf, Property 11: Hanya satu template aktif
test("mengaktifkan template menonaktifkan yang lain", async () => {
  // Insert 3 template
  // Aktifkan masing-masing secara bergantian
  // Setiap setelah aktivasi, COUNT(aktif=true) harus === 1
});

// Feature: sertifikat-wakaf, Property 12: Duplikasi sertifikat dicegah
test("generate sertifikat kedua kali untuk transaksi yang sama → 409", async () => {
  // Generate pertama → 201
  // Generate kedua dengan transaksiId sama → 409
});

// Feature: sertifikat-wakaf, Property 13: Password tersimpan sebagai hash
test("password tersimpan sebagai bcrypt hash bukan plaintext", async () => {
  fc.assert(
    fc.property(
      fc.string({ minLength: 8 }),
      async (password) => {
        await createUser({ email: `test-${Date.now()}@test.com`, password });
        const user = await db.query.pengguna.findFirst({ where: ... });
        expect(user!.passwordHash).not.toBe(password);
        expect(user!.passwordHash).toMatch(/^\$2[ab]\$\d+\$/); // bcrypt pattern
      }
    )
  );
});
```

### Contoh Test — Spesifik (non-property)

```typescript
// Contoh-based unit tests untuk kasus spesifik
test("terbilang: 0 → 'Nol Rupiah'", () => {
  expect(angkaKeTerbilang(0)).toBe("Nol Rupiah");
});

test("terbilang: 500000 → 'Lima Ratus Ribu Rupiah'", () => {
  expect(angkaKeTerbilang(500000)).toBe("Lima Ratus Ribu Rupiah");
});

test("terbilang: 1500 → 'Seribu Lima Ratus Rupiah'", () => {
  expect(angkaKeTerbilang(1500)).toBe("Seribu Lima Ratus Rupiah");
});

test("GET /donatur/:id dengan id tidak ada → 404", async () => {
  const res = await app.request("/donatur/999999", { headers: { ... } });
  expect(res.status).toBe(404);
});

test("GET /sertifikat/:id/download mengembalikan PDF dengan header Content-Disposition", async () => {
  const res = await app.request(`/sertifikat/${sertifikatId}/download`);
  expect(res.headers.get("Content-Disposition")).toContain("attachment");
  expect(res.headers.get("Content-Disposition")).toContain(".pdf");
});
```

### Menjalankan Tests

```bash
# Unit tests (tanpa database)
bun test server/src/lib/

# Semua tests
bun test --run

# Dengan coverage
bun test --coverage
```

### Catatan Implementasi Tambahan

**fast-check** perlu ditambahkan sebagai dependency:
```bash
bun add -d fast-check
```

**Strikethrough pada deskripsi wakaf** — pdf-lib tidak mendukung text-decoration natively. Untuk kata yang perlu dicoret (misal "Barang" pada wakaf uang), gambar garis tipis manual:
```typescript
const strikeY = yPdf + fontSize * 0.35; // tengah tinggi huruf
page.drawLine({ start: { x: xDraw, y: strikeY }, end: { x: xDraw + textWidth, y: strikeY }, thickness: 1, color: rgb(0.05, 0.05, 0.05) });
```

**Font kustom** — Background sertifikat menggunakan font dekoratif. Untuk nama donatur yang matching, embed font TTF kustom:
```typescript
import fontkit from "@pdf-lib/fontkit";
pdfDoc.registerFontkit(fontkit);
const fontBytes = await fs.readFile("storage/fonts/NamaFont.ttf");
const customFont = await pdfDoc.embedFont(fontBytes);
```
