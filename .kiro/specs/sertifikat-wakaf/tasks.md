# Implementation Plan: Sertifikat Wakaf

## Overview

Implementasi aplikasi manajemen wakaf berbasis web untuk Yayasan Adab Insan Mulia menggunakan stack BHVR (Bun + Hono + Vite + React) dalam monorepo Turborepo. Implementasi dimulai dari fondasi bersama (`shared` types), lanjut ke database layer (Drizzle + Neon PostgreSQL), library modules, API server (Hono routes + middleware), hingga client React dan pengujian.

## Tasks

- [x] 1. Setup shared types dan konfigurasi monorepo
  - [x] 1.1 Buat file `shared/src/types/donatur.ts` dengan interface `Donatur` dan `BuatDonaturInput`
    - Definisikan interface sesuai design: `id`, `nama`, `noHp`, `email`, `alamat`, `nik`, `createdAt`
    - _Requirements: 1.1_
  - [x] 1.2 Buat file `shared/src/types/program.ts` dengan interface `Program` dan `BuatProgramInput`
    - Definisikan interface: `id`, `namaProgram`, `deskripsi`, `aktif`
    - _Requirements: 2.1_
  - [x] 1.3 Buat file `shared/src/types/pengguna.ts` dengan type `Role`, interface `Pengguna`, `BuatPenggunaInput`, `LoginInput`, `LoginResponse`
    - Sertakan union type `Role = "superadmin" | "admin" | "kasir"`
    - _Requirements: 3.1_
  - [x] 1.4 Buat file `shared/src/types/penandatangan.ts` dengan interface `Penandatangan` dan `BuatPenandatanganInput`
    - _Requirements: 7.1_
  - [x] 1.5 Buat file `shared/src/types/transaksi.ts` dengan interface `Transaksi`, `TransaksiDetail`, dan `BuatTransaksiInput`
    - Sertakan union type untuk `jenis` dan `status`
    - `TransaksiDetail` extends `Transaksi` dengan nested `donatur` dan `program`
    - _Requirements: 4.1_
  - [x] 1.6 Buat file `shared/src/types/sertifikat.ts` dengan interface `Sertifikat` dan `SertifikatDetail`
    - `SertifikatDetail` extends `Sertifikat` dengan nested `transaksi: TransaksiDetail`
    - _Requirements: 5.10, 5.11_
  - [x] 1.7 Buat file `shared/src/types/template.ts` dengan interface `LayoutFieldItem`, `LayoutField`, `TemplateSertifikat`, `TemplateSertifikatDetail`, dan `BuatTemplateInput`
    - `LayoutFieldItem`: `x`, `y`, `size`, `align`, `bold`
    - `LayoutField` berisi semua 5 field dinamis + `canvasWidth` + `canvasHeight`
    - _Requirements: 6.1, 6.5_
  - [x] 1.8 Buat file `shared/src/types/index.ts` dengan interface `ApiResponse<T>` dan re-export semua types
    - `ApiResponse<T>`: `success`, `message`, `data?`
    - _Requirements: 11.9_
  - [x] 1.9 Update `shared/src/index.ts` untuk re-export dari `./types`
    - _Requirements: 11.9_

- [x] 2. Setup database schema dan koneksi Neon PostgreSQL
  - [x] 2.1 Tambahkan dependencies database ke `server/package.json`
    - Tambah `drizzle-orm`, `postgres`, `drizzle-kit` (dev)
    - Tambah `bcryptjs` dan `@types/bcryptjs` untuk password hashing
    - Tambah `jose` untuk JWT
    - Tambah `pdf-lib` dan `@pdf-lib/fontkit` untuk PDF generation
    - _Requirements: 3.7, 5.5_
  - [x] 2.2 Buat file `server/.env` dengan `DATABASE_URL` ke Neon PostgreSQL
    - Isi: `DATABASE_URL=postgresql://neondb_owner:npg_zFUVIxp37SdR@ep-winter-haze-b3rw8hih-pooler.c-4.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require`
    - Tambahkan `server/.env` ke `.gitignore`
    - _Requirements: (database setup)_
  - [x] 2.3 Buat file `server/src/db/schema.ts` dengan Drizzle pgTable schema
    - Definisikan pgEnum untuk `role`, `jenis_wakaf`, `status_transaksi`, `status_sertifikat`
    - Buat semua tabel: `donatur`, `program`, `pengguna`, `penandatangan`, `template_sertifikat`, `transaksi`, `sertifikat`
    - Gunakan `serial`, `text`, `boolean`, `numeric`, `integer`, `timestamp`, `jsonb` dari `drizzle-orm/pg-core`
    - `layoutField` kolom menggunakan `jsonb`.$type\<LayoutField\>()
    - _Requirements: 1.1, 2.1, 3.1, 4.1, 5.10, 6.1, 7.1_
  - [x] 2.4 Buat file `server/src/db/client.ts` dengan koneksi postgres-js dan drizzle instance
    - Import `drizzle` dari `drizzle-orm/postgres-js` dan `postgres` dari `postgres`
    - Baca `DATABASE_URL` dari `process.env`
    - Export `db` dan `DrizzleDb` type
    - _Requirements: (database setup)_
  - [x] 2.5 Buat file `drizzle.config.ts` di root `server/` untuk drizzle-kit
    - Konfigurasi `dialect: "postgresql"`, `schema`, `out` direktori migrations
    - _Requirements: (database setup)_
  - [x] 2.6 Jalankan `bunx drizzle-kit push` untuk push schema ke Neon (atau generate + apply migrations)
    - Verifikasi semua tabel terbuat di Neon dashboard
    - _Requirements: (database setup)_

- [x] 3. Implementasi library modules server
  - [x] 3.1 Buat `server/src/lib/terbilang.ts` — fungsi `angkaKeTerbilang(n: number): string`
    - Implementasi konversi angka 0 – 999.999.999.999 ke teks bahasa Indonesia Title Case
    - Akhiri semua output dengan " Rupiah"
    - Throw `RangeError` untuk input negatif, bukan integer, atau > 999.999.999.999
    - Tangani kasus khusus: 0 → "Nol Rupiah", ribuan dengan "Seribu" bukan "Satu Ribu"
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_
  - [ ]* 3.2 Tulis property tests untuk `terbilang.ts` (bun:test + fast-check)
    - **Property 1: Terbilang round-trip** — parse ulang output menghasilkan nilai asli
    - **Validates: Requirements 10.6**
    - **Property 2: Terbilang menolak input invalid** — negatif, non-integer, > 999B throw error
    - **Validates: Requirements 10.4**
    - **Property 3: Terbilang output Title Case dan berakhir "Rupiah"**
    - **Validates: Requirements 10.1, 10.5**
  - [x] 3.3 Buat `server/src/lib/nomor.ts` — fungsi `generateNomor(prefix, db): Promise<string>`
    - Format output: `PREFIX/YYYY/MM/NNNNN` (5 digit zero-padded)
    - Gunakan `pg_advisory_xact_lock` dalam transaksi DB untuk concurrency safety
    - Hitung counter dari COUNT(*) record bulan yang sama lalu tambah 1
    - Buat helper `buildNomorString(prefix, year, month, seq)` yang bisa ditest secara unit
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 4.2, 5.4_
  - [ ]* 3.4 Tulis unit tests untuk format nomor di `nomor.test.ts`
    - **Property 4: Format nomor sekuensial valid** — match regex `PREFIX/YYYY/MM/NNNNN`
    - **Validates: Requirements 9.1, 9.3**
  - [x] 3.5 Buat `server/src/lib/pdf.ts` — fungsi `renderSertifikatPDF(data, template): Promise<string>`
    - Definisikan interface `RenderData` (noTransaksi, noSertifikat, namaDonatur, namaProgram, jenis, jumlahTerbilang, tanggalTerbit)
    - Embed PNG background menggunakan `pdfDoc.embedPng(bgBytes)`
    - Buat fungsi helper `centerX(text, fontSize, font, xCenter)` dan `rightAlignX(text, fontSize, font, xRight)`
    - Implementasi y-flip: `y_pdf = canvasHeight - y_layout`
    - Render 5 field dinamis sesuai `layoutField`: `namaDonatur` (uppercase), `deskripsiWakaf`, `jumlahTerbilang`, `noSertifikat`, `tanggalTerbit`
    - Tambahkan fungsi `formatTanggalIndo(iso: string)` untuk format tanggal Indonesia
    - Simpan output ke `storage/sertifikat/[noTransaksi].pdf`
    - _Requirements: 5.5, 5.6, 5.7, 5.8, 5.9, 5.10_
  - [ ]* 3.6 Tulis property tests untuk transformasi koordinat PDF di `pdf.test.ts`
    - **Property 6: Koordinat y PDF terflip** — `y_pdf + y_layout === canvasHeight`
    - **Validates: Requirements 5.6**
    - **Property 7: Alignment tengah** — `x_draw + textWidth/2 === x_center`
    - **Validates: Requirements 5.7**
    - **Property 8: Alignment kanan** — `x_draw + textWidth === x_right`
    - **Validates: Requirements 5.8**

- [x] 4. Checkpoint — Verifikasi library modules
  - Pastikan semua unit tests library lulus, tanya user jika ada pertanyaan.

- [x] 5. Implementasi auth middleware dan role guard
  - [x] 5.1 Buat `server/src/middleware/auth.ts` — verifikasi JWT Bearer token
    - Baca token dari header `Authorization: Bearer <token>` menggunakan `jose`
    - Simpan payload pengguna ke context dengan `c.set("pengguna", payload)`
    - Return HTTP 401 jika token tidak ada, tidak valid, atau kadaluwarsa
    - _Requirements: 3.4, 3.5_
  - [x] 5.2 Buat `server/src/middleware/role.ts` — factory `requireRole(roles: Role[])`
    - Ambil pengguna dari context, periksa apakah role-nya ada di array yang diizinkan
    - Return HTTP 403 dengan pesan "Akses ditolak" jika role tidak sesuai
    - _Requirements: 3.1, 3.6_

- [ ] 6. Implementasi routes auth, pengguna, dan donatur
  - [x] 6.1 Buat `server/src/routes/auth.ts` — `POST /auth/login`
    - Validasi input `email` dan `password`
    - Query database untuk pengguna dengan email yang cocok
    - Bandingkan password dengan hash menggunakan `bcryptjs.compare`
    - Generate JWT token menggunakan `jose` dengan payload `{ id, email, role }`
    - Return HTTP 401 jika kredensial salah, 200 + `LoginResponse` jika berhasil
    - _Requirements: 3.2, 3.3_
  - [-] 6.2 Buat `server/src/routes/pengguna.ts` — CRUD pengguna
    - `POST /pengguna` (superadmin only): hash password dengan bcrypt cost=10, insert ke DB, return 201
    - `GET /pengguna` (superadmin only): daftar semua pengguna (tanpa `passwordHash`)
    - _Requirements: 3.7, 3.8_
  - [x] 6.3 Buat `server/src/routes/donatur.ts` — CRUD donatur
    - `POST /donatur`: validasi `nama` tidak kosong/whitespace-only → 400 jika gagal, insert → 201
    - `GET /donatur`: return semua donatur
    - `GET /donatur/:id`: return satu donatur atau 404
    - `PUT /donatur/:id`: update donatur, return data terbaru
    - `DELETE /donatur/:id`: cek transaksi terkait → 409 jika ada, hapus jika tidak ada
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8_
  - [ ]* 6.4 Tulis integration test untuk validasi nama donatur
    - **Property 9: Validasi nama donatur — whitespace ditolak** — `POST /donatur` dengan nama whitespace → 400
    - **Validates: Requirements 1.2**

- [x] 7. Implementasi routes program, penandatangan, dan template
  - [x] 7.1 Buat `server/src/routes/program.ts` — CRUD program wakaf
    - `POST /program` (superadmin): insert program baru → 201
    - `GET /program`: return semua program; jika `?aktif=true` filter hanya yang aktif
    - `PATCH /program/:id`: update `aktif` status program
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_
  - [ ]* 7.2 Tulis integration test untuk filter program aktif
    - **Property 14: Filter program aktif bersifat eksklusif** — `GET /program?aktif=true` tidak pernah return program inaktif
    - **Validates: Requirements 2.4**
  - [x] 7.3 Buat `server/src/routes/penandatangan.ts` — CRUD penandatangan
    - `POST /penandatangan` (superadmin): insert → 201
    - `GET /penandatangan`: return semua penandatangan
    - `PUT /penandatangan/:id`: update data penandatangan → data terbaru
    - _Requirements: 7.1, 7.2, 7.3, 7.4_
  - [x] 7.4 Buat `server/src/routes/template.ts` — CRUD template sertifikat
    - `POST /template` (superadmin): validasi `layoutField` memiliki semua 7 field wajib → 400 jika kurang, insert → 201
    - `GET /template`: return semua template beserta data penandatangan (JOIN)
    - `PATCH /template/:id/aktif` (superadmin): set semua template `aktif = false`, lalu set template target `aktif = true` dalam satu transaksi DB
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7_
  - [ ]* 7.5 Tulis integration test untuk constraint satu template aktif
    - **Property 11: Hanya satu template aktif pada satu waktu**
    - **Validates: Requirements 6.3, 6.4**

- [ ] 8. Implementasi routes transaksi dan sertifikat
  - [-] 8.1 Buat `server/src/routes/transaksi.ts` — CRUD transaksi
    - `POST /transaksi`: validasi `donaturId` ada → 404, `programId` ada + aktif → 400, `jenis=barang` + `deskripsiBarang` kosong → 400; panggil `generateNomor("TRX")` dan `angkaKeTerbilang(jumlah)`; insert → 201
    - `GET /transaksi`: return daftar transaksi dengan JOIN donatur dan program
    - `PATCH /transaksi/:id/status`: update status (`pending`/`terverifikasi`/`batal`)
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 4.10_
  - [ ]* 8.2 Tulis integration test untuk validasi transaksi barang
    - **Property 10: Validasi deskripsi barang — whitespace ditolak**
    - **Validates: Requirements 4.7**
  - [~] 8.3 Buat `server/src/routes/sertifikat.ts` — generate dan akses sertifikat
    - `POST /sertifikat/generate/:transaksiId` (admin/superadmin):
      1. Cek transaksi exist + status `terverifikasi` → 400 jika tidak
      2. Cek template aktif ada → 400 jika tidak
      3. Cek sertifikat duplikat (UNIQUE constraint) → 409 jika sudah ada
      4. Panggil `generateNomor("CERT")`
      5. Buat `RenderData` dari data transaksi + donatur + program
      6. Panggil `renderSertifikatPDF(renderData, template)` dulu sebelum insert DB
      7. Insert record sertifikat ke DB → return 201
    - `GET /sertifikat`: daftar sertifikat dengan detail transaksi+donatur, urut `tanggalTerbit` desc
    - `GET /sertifikat/:id`: detail sertifikat lengkap atau 404
    - `GET /sertifikat/:id/download`: stream file PDF dengan header `Content-Disposition: attachment; filename="[noSertifikat].pdf"` atau 404 jika file tidak ada
    - `PATCH /sertifikat/:id/status`: update `status` dan `dikirimVia`
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.9, 5.10, 5.11, 5.12, 5.13, 8.1, 8.2, 8.3, 8.4, 8.5, 8.7_
  - [ ]* 8.4 Tulis integration test untuk pencegahan duplikasi sertifikat
    - **Property 12: Duplikasi sertifikat dicegah** — generate kedua dengan transaksiId sama → 409
    - **Validates: Requirements 5.12_
  - [ ]* 8.5 Tulis integration test untuk password hash
    - **Property 13: Password tersimpan sebagai hash** — `passwordHash` bukan plaintext + match bcrypt pattern
    - **Validates: Requirements 3.7**
  - [ ]* 8.6 Tulis integration test untuk keunikan nomor (nomor tidak duplikat dalam bulan yang sama)
    - **Property 5: Keunikan nomor sekuensial dalam satu bulan**
    - **Validates: Requirements 9.4, 4.10, 5.13**

- [ ] 9. Wiring server: index.ts, CORS, static file serving, setup storage
  - [-] 9.1 Buat direktori `storage/sertifikat/`, `storage/backgrounds/`, `storage/ttd/`, `storage/fonts/`
    - Tambahkan `storage/sertifikat/`, `storage/ttd/` ke `.gitignore` (file generated)
    - Tambahkan `storage/.gitkeep` agar direktori ditrack
    - _Requirements: 5.10_
  - [~] 9.2 Update `server/src/index.ts` — mount semua routes + middleware
    - Import dan mount: `auth`, `donatur`, `program`, `pengguna`, `penandatangan`, `transaksi`, `sertifikat`, `template`
    - Tambahkan `cors()` middleware dari `hono/cors`
    - Tambahkan static file serving untuk `storage/` agar PDF bisa diakses via URL
    - Terapkan `authMiddleware` ke semua route kecuali `POST /auth/login`
    - _Requirements: 3.4, 3.5, 8.3_

- [~] 10. Checkpoint — Verifikasi server API
  - Pastikan semua routes terdaftar dan server bisa start, tanya user jika ada pertanyaan.

- [ ] 11. Implementasi client — setup dan lib/api.ts
  - [~] 11.1 Tambahkan dependencies client ke `client/package.json`
    - Tambah `react-router-dom` (atau `@tanstack/react-router`) untuk navigasi
    - Verifikasi `@tanstack/react-query` sudah ada
    - _Requirements: 11.1, 11.2, 11.3, 11.4_
  - [~] 11.2 Buat `client/src/lib/api.ts` — fetch wrapper ke server
    - Baca `VITE_SERVER_URL` dari env, fallback ke `http://localhost:3000`
    - Export fungsi-fungsi typed untuk setiap endpoint: `fetchDonatur`, `createDonatur`, dll.
    - Sertakan token JWT di header `Authorization: Bearer <token>` dari localStorage
    - _Requirements: 11.9_
  - [~] 11.3 Buat `client/src/lib/auth.ts` — helper untuk menyimpan/membaca token
    - `setToken(token)`, `getToken()`, `clearToken()` menggunakan localStorage
    - `isLoggedIn()` helper
    - _Requirements: 3.4_

- [ ] 12. Implementasi client pages
  - [~] 12.1 Buat `client/src/pages/LoginPage.tsx` — form login
    - Form dengan field `email` dan `password`
    - `useMutation` untuk `POST /auth/login`, simpan token ke localStorage
    - Redirect ke halaman utama setelah login berhasil
    - _Requirements: 3.2, 3.3_
  - [~] 12.2 Buat `client/src/pages/DonaturPage.tsx` — tabel donatur + form tambah/edit
    - `useQuery` untuk fetch daftar donatur
    - Tabel dengan kolom: nama, noHp, email, NIK, aksi
    - Form untuk tambah dan edit donatur (validasi nama wajib di client side)
    - `useMutation` untuk create/update/delete
    - Tampilkan loading state dan error message dari `ApiResponse`
    - _Requirements: 11.1, 1.3, 1.4, 1.7_
  - [~] 12.3 Buat `client/src/pages/TransaksiPage.tsx` — tabel transaksi + form catat
    - `useQuery` untuk fetch daftar transaksi (dengan info donatur dan program)
    - Form untuk mencatat transaksi baru: select donatur, select program, jenis, jumlah, metode bayar, catatan
    - Tampilkan field `deskripsiBarang` hanya ketika `jenis = "barang"`
    - `useMutation` untuk create + update status
    - Disable tombol saat `mutation.isPending`
    - _Requirements: 11.2, 4.1, 4.4, 4.8, 4.9_
  - [~] 12.4 Buat `client/src/pages/SertifikatPage.tsx` — daftar sertifikat + generate
    - `useQuery` untuk fetch daftar sertifikat
    - Tombol "Buat Sertifikat" pada transaksi yang belum punya sertifikat
    - `useMutation` untuk `POST /sertifikat/generate/:transaksiId`
    - Setelah berhasil: tampilkan link download PDF dan tombol "Kirim via WhatsApp"
    - Tombol WhatsApp membuka `https://wa.me/[noHp]?text=[encoded]` di tab baru
    - Tampilkan loading indicator dan nonaktifkan tombol saat pending
    - Tampilkan pesan error user-friendly (tanpa stack trace) jika gagal
    - _Requirements: 11.3, 11.5, 11.6, 11.7, 11.8, 8.6_
  - [~] 12.5 Buat `client/src/pages/TemplateEditorPage.tsx` — manajemen template (superadmin)
    - `useQuery` untuk fetch daftar template
    - Tampilkan template list dengan status aktif/nonaktif
    - Tombol "Aktifkan" untuk mengaktifkan template tertentu
    - Form untuk tambah template baru (nama, path background, layoutField JSON editor)
    - _Requirements: 11.4, 6.1, 6.2, 6.3, 6.4, 6.7_
  - [~] 12.6 Buat `client/src/App.tsx` — router dan layout utama
    - Setup React Router dengan routes: `/login`, `/donatur`, `/transaksi`, `/sertifikat`, `/template`
    - Tambahkan protected route yang redirect ke `/login` jika belum login
    - Navigation sidebar atau topbar dengan link ke tiap halaman
    - _Requirements: 11.1, 11.2, 11.3, 11.4_

- [~] 13. Final checkpoint — Verifikasi end-to-end
  - Pastikan semua unit tests dan integration tests lulus.
  - Verifikasi alur utama: login → catat transaksi → generate sertifikat → download PDF.
  - Tanya user jika ada pertanyaan atau adjustment yang diperlukan.

## Notes

- Tasks bertanda `*` adalah opsional dan dapat dilewati untuk MVP yang lebih cepat
- Setiap task referensi ke requirements spesifik untuk traceability
- Checkpoint memastikan validasi inkremental sebelum lanjut ke layer berikutnya
- Property tests menggunakan `fast-check` (tambahkan ke dev dependencies server: `bun add -d fast-check`)
- Unit tests menggunakan Bun built-in test runner (`bun:test`) — jalankan dengan `bun test --run`
- Database connection string disimpan di `server/.env` (jangan commit ke git)
- PDF generator menulis file ke `storage/sertifikat/` — direktori harus ada sebelum server dijalankan
- Advisory lock di `generateNomor` menggunakan `pg_advisory_xact_lock(hashtext(...))` agar concurrency-safe
- Untuk font kustom pada PDF: gunakan `@pdf-lib/fontkit` dan `pdfDoc.registerFontkit(fontkit)` lalu embed `.ttf`

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "1.3", "1.4", "1.5", "1.6", "1.7", "1.8", "1.9"] },
    { "id": 1, "tasks": ["2.1", "2.2"] },
    { "id": 2, "tasks": ["2.3", "2.4", "2.5"] },
    { "id": 3, "tasks": ["2.6"] },
    { "id": 4, "tasks": ["3.1", "3.3", "3.5"] },
    { "id": 5, "tasks": ["3.2", "3.4", "3.6"] },
    { "id": 6, "tasks": ["5.1", "5.2"] },
    { "id": 7, "tasks": ["6.1", "6.3", "9.1"] },
    { "id": 8, "tasks": ["6.2", "6.4", "7.1", "7.3", "7.4"] },
    { "id": 9, "tasks": ["7.2", "7.5"] },
    { "id": 10, "tasks": ["8.1"] },
    { "id": 11, "tasks": ["8.2", "8.3"] },
    { "id": 12, "tasks": ["8.4", "8.5", "8.6", "9.2"] },
    { "id": 13, "tasks": ["11.1", "11.2", "11.3"] },
    { "id": 14, "tasks": ["12.1"] },
    { "id": 15, "tasks": ["12.2", "12.3", "12.4", "12.5"] },
    { "id": 16, "tasks": ["12.6"] }
  ]
}
```
