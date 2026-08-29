# Dokumen Persyaratan — Sertifikat Wakaf

## Pendahuluan

Aplikasi Sertifikat Wakaf adalah sistem manajemen wakaf berbasis web yang memungkinkan organisasi (Yayasan Adab Insan Mulia) untuk mencatat donatur, mengelola transaksi wakaf, dan menerbitkan sertifikat wakaf PDF secara otomatis. Aplikasi dibangun dengan stack BHVR (Bun + Hono + Vite + React) dalam monorepo, menggunakan SQLite untuk development dan PostgreSQL untuk produksi melalui Drizzle ORM. PDF sertifikat digenerate menggunakan pdf-lib dengan background PNG yang sudah didesain.

## Glosarium

- **Sistem**: Keseluruhan aplikasi Sertifikat Wakaf (client + server)
- **Server**: Hono API server yang berjalan di Bun runtime
- **Client**: Antarmuka web berbasis React + Vite
- **Database**: Penyimpanan data (SQLite untuk development, PostgreSQL untuk produksi) diakses via Drizzle ORM
- **PDF_Generator**: Modul `server/src/lib/pdf.ts` yang menggunakan pdf-lib untuk merender sertifikat
- **Nomor_Generator**: Modul `server/src/lib/nomor.ts` yang menghasilkan nomor unik berformat sekuensial
- **Terbilang_Converter**: Modul `server/src/lib/terbilang.ts` yang mengonversi angka ke teks bahasa Indonesia
- **Donatur**: Individu yang melakukan wakaf
- **Transaksi**: Catatan wakaf yang dilakukan seorang donatur pada suatu program
- **Sertifikat**: Dokumen PDF resmi yang diterbitkan sebagai bukti wakaf
- **Template_Sertifikat**: Konfigurasi yang menyimpan file background dan koordinat field pada sertifikat
- **Penandatangan**: Pejabat yayasan yang tanda tangannya ditampilkan pada background sertifikat
- **Program**: Kategori atau tujuan wakaf (misal: Wakaf Air Sehat)
- **Pengguna**: Akun operator sistem dengan role tertentu
- **Layout_Field**: Objek JSON yang menyimpan koordinat (x, y), ukuran font, dan alignment setiap field teks pada sertifikat
- **No_Transaksi**: Nomor unik transaksi berformat `TRX/YYYY/MM/NNNNN`
- **No_Sertifikat**: Nomor unik sertifikat berformat `CERT/YYYY/MM/NNNNN`
- **Superadmin**: Role dengan akses penuh ke seluruh fitur sistem termasuk manajemen pengguna dan template
- **Admin**: Role dengan akses ke manajemen donatur, transaksi, dan sertifikat
- **Kasir**: Role dengan akses terbatas hanya untuk mencatat transaksi dan melihat data

---

## Persyaratan

### Persyaratan 1: Manajemen Data Donatur

**User Story:** Sebagai admin, saya ingin mengelola data donatur, agar informasi donatur tersimpan dengan benar dan dapat digunakan saat mencatat transaksi.

#### Kriteria Penerimaan

1. THE Sistem SHALL menyimpan data donatur dengan atribut: nama (wajib), nomor HP, email, alamat, dan NIK.
2. WHEN admin mengirimkan formulir pembuatan donatur dengan field `nama` kosong, THE Server SHALL mengembalikan respons error dengan kode HTTP 400 dan pesan yang menjelaskan field yang tidak valid.
3. WHEN admin mengirimkan permintaan daftar donatur ke `GET /donatur`, THE Server SHALL mengembalikan daftar semua donatur yang tersimpan di Database dalam format `ApiResponse<Donatur[]>`.
4. WHEN admin mengirimkan data donatur baru yang valid ke `POST /donatur`, THE Server SHALL menyimpan donatur ke Database dan mengembalikan data donatur yang tersimpan termasuk `id` yang digenerate dalam format `ApiResponse<Donatur>` dengan kode HTTP 201.
5. WHEN admin mengirimkan permintaan detail donatur ke `GET /donatur/:id` dengan `id` yang ada di Database, THE Server SHALL mengembalikan data donatur tersebut dalam format `ApiResponse<Donatur>`.
6. IF admin mengirimkan permintaan ke `GET /donatur/:id` dengan `id` yang tidak ada di Database, THEN THE Server SHALL mengembalikan respons dengan kode HTTP 404 dan pesan "Donatur tidak ditemukan".
7. WHEN admin mengirimkan permintaan update donatur ke `PUT /donatur/:id` dengan data yang valid, THE Server SHALL memperbarui data donatur di Database dan mengembalikan data terbaru dalam format `ApiResponse<Donatur>`.
8. WHEN admin mengirimkan permintaan hapus donatur ke `DELETE /donatur/:id`, THE Sistem SHALL menolak penghapusan jika donatur memiliki transaksi terkait dan mengembalikan respons HTTP 409 dengan pesan yang menjelaskan alasan.

---

### Persyaratan 2: Manajemen Program Wakaf

**User Story:** Sebagai superadmin, saya ingin mengelola program wakaf, agar transaksi dapat dikategorikan berdasarkan tujuan penggunaan dana.

#### Kriteria Penerimaan

1. THE Sistem SHALL menyimpan data program wakaf dengan atribut: nama program (wajib), deskripsi, dan status aktif.
2. WHEN superadmin mengirimkan data program baru yang valid ke `POST /program`, THE Server SHALL menyimpan program ke Database dan mengembalikan data program termasuk `id` dalam format `ApiResponse<Program>` dengan kode HTTP 201.
3. WHEN pengguna mengirimkan permintaan daftar program ke `GET /program`, THE Server SHALL mengembalikan seluruh program yang tersimpan di Database.
4. WHERE fitur filter aktif digunakan, THE Server SHALL mengembalikan hanya program dengan status `aktif = true` ketika parameter `?aktif=true` disertakan pada `GET /program`.
5. WHEN superadmin mengirimkan permintaan ubah status program ke `PATCH /program/:id`, THE Server SHALL memperbarui field `aktif` program di Database dan mengembalikan data program terbaru.

---

### Persyaratan 3: Manajemen Pengguna dan Autentikasi

**User Story:** Sebagai superadmin, saya ingin mengelola akun pengguna dengan role berbeda, agar hanya pengguna berwenang yang dapat mengakses fungsi tertentu.

#### Kriteria Penerimaan

1. THE Sistem SHALL mendukung tiga role pengguna: `superadmin`, `admin`, dan `kasir`, dengan hak akses yang berbeda.
2. WHEN pengguna mengirimkan `email` dan `password` yang valid ke `POST /auth/login`, THE Server SHALL memverifikasi kredensial terhadap Database, menghasilkan token sesi, dan mengembalikan token tersebut dalam respons.
3. IF pengguna mengirimkan `email` atau `password` yang tidak cocok ke `POST /auth/login`, THEN THE Server SHALL mengembalikan respons HTTP 401 dengan pesan "Email atau kata sandi salah".
4. WHILE pengguna memiliki token sesi yang valid, THE Server SHALL mengizinkan akses ke endpoint yang dilindungi.
5. IF pengguna mengirimkan permintaan ke endpoint yang dilindungi tanpa menyertakan token sesi yang valid, THEN THE Server SHALL mengembalikan respons HTTP 401.
6. IF pengguna dengan role `kasir` mengirimkan permintaan ke endpoint yang hanya diizinkan untuk `admin` atau `superadmin`, THEN THE Server SHALL mengembalikan respons HTTP 403 dengan pesan "Akses ditolak".
7. THE Server SHALL menyimpan kata sandi pengguna sebagai hash (menggunakan algoritma bcrypt dengan cost factor minimal 10) dan tidak pernah menyimpan kata sandi dalam bentuk teks biasa.
8. WHEN superadmin mengirimkan data pengguna baru yang valid ke `POST /pengguna`, THE Server SHALL membuat akun pengguna baru di Database dengan password yang sudah di-hash.

---

### Persyaratan 4: Pencatatan Transaksi Wakaf

**User Story:** Sebagai kasir atau admin, saya ingin mencatat transaksi wakaf donatur, agar setiap wakaf terdokumentasi dengan nomor unik dan informasi lengkap.

#### Kriteria Penerimaan

1. THE Sistem SHALL menyimpan data transaksi dengan atribut: `donaturId`, `programId`, `jenis` (uang/barang), `deskripsiBarang` (wajib jika jenis=barang), `jumlah`, `metodePembayaran`, `tanggal`, `status`, dan `catatan`.
2. WHEN kasir atau admin mengirimkan data transaksi yang valid ke `POST /transaksi`, THE Nomor_Generator SHALL menghasilkan `noTransaksi` unik berformat `TRX/YYYY/MM/NNNNN` di mana `YYYY` adalah tahun, `MM` adalah bulan, dan `NNNNN` adalah urutan 5 digit yang di-reset setiap bulan.
3. WHEN transaksi baru berhasil dibuat, THE Terbilang_Converter SHALL mengonversi nilai `jumlah` ke teks bahasa Indonesia dan menyimpannya sebagai field `jumlahTerbilang` (contoh: `500000` → "Lima Ratus Ribu Rupiah").
4. WHEN kasir atau admin mengirimkan data transaksi yang valid ke `POST /transaksi`, THE Server SHALL menyimpan transaksi ke Database dan mengembalikan data transaksi termasuk `noTransaksi` dan `jumlahTerbilang` dalam format `ApiResponse<Transaksi>` dengan kode HTTP 201.
5. IF kasir atau admin mengirimkan data transaksi dengan `donaturId` yang tidak ada di Database, THEN THE Server SHALL mengembalikan respons HTTP 404 dengan pesan "Donatur tidak ditemukan".
6. IF kasir atau admin mengirimkan data transaksi dengan `programId` yang tidak ada di Database atau program tidak aktif, THEN THE Server SHALL mengembalikan respons HTTP 400 dengan pesan yang menjelaskan kondisi program.
7. IF kasir atau admin mengirimkan data transaksi dengan `jenis = "barang"` tetapi `deskripsiBarang` kosong, THEN THE Server SHALL mengembalikan respons HTTP 400 dengan pesan "Deskripsi barang wajib diisi untuk wakaf barang".
8. WHEN admin mengirimkan permintaan daftar transaksi ke `GET /transaksi`, THE Server SHALL mengembalikan daftar transaksi dari Database yang mencakup data donatur dan program terkait.
9. WHEN admin mengirimkan permintaan update status transaksi ke `PATCH /transaksi/:id/status` dengan status valid (`pending`, `terverifikasi`, atau `batal`), THE Server SHALL memperbarui status transaksi di Database.
10. THE Nomor_Generator SHALL menghasilkan `noTransaksi` yang unik di antara seluruh transaksi yang tersimpan di Database dalam bulan yang sama.

---

### Persyaratan 5: Generate Sertifikat Wakaf PDF

**User Story:** Sebagai admin, saya ingin menerbitkan sertifikat wakaf PDF secara otomatis dari data transaksi, agar donatur mendapatkan dokumen resmi yang tercetak rapi.

#### Kriteria Penerimaan

1. WHEN admin mengirimkan permintaan `POST /sertifikat/generate/:transaksiId`, THE Server SHALL memeriksa bahwa transaksi dengan `transaksiId` tersebut ada dan berstatus `terverifikasi` di Database.
2. IF transaksi tidak ditemukan atau berstatus bukan `terverifikasi`, THEN THE Server SHALL mengembalikan respons HTTP 400 dengan pesan yang menjelaskan kondisi transaksi.
3. IF tidak ada `templateSertifikat` dengan status `aktif = true` di Database, THEN THE Server SHALL mengembalikan respons HTTP 400 dengan pesan "Template sertifikat belum diatur".
4. WHEN kondisi untuk generate terpenuhi, THE Nomor_Generator SHALL menghasilkan `noSertifikat` unik berformat `CERT/YYYY/MM/NNNNN` dengan aturan urutan yang sama seperti `noTransaksi`.
5. WHEN kondisi untuk generate terpenuhi, THE PDF_Generator SHALL membuat dokumen PDF baru berukuran 2000×1414 pixel dengan background PNG dari field `fileBackground` pada template aktif yang di-embed ke halaman PDF.
6. WHEN PDF_Generator merender field teks pada sertifikat, THE PDF_Generator SHALL menghitung koordinat y dengan formula `y_pdf = pageHeight - y_layout` untuk mengonversi dari koordinat top-left (layout) ke koordinat bottom-left (pdf-lib).
7. WHEN PDF_Generator merender field dengan `align = "center"`, THE PDF_Generator SHALL menghitung posisi x dengan formula `x_draw = x_center - (textWidth / 2)` sehingga teks berada tepat di tengah koordinat yang ditentukan.
8. WHEN PDF_Generator merender field dengan `align = "right"`, THE PDF_Generator SHALL menghitung posisi x dengan formula `x_draw = x_right - textWidth` sehingga ujung kanan teks berada tepat di koordinat yang ditentukan.
9. THE PDF_Generator SHALL merender lima field dinamis pada sertifikat sesuai koordinat dari `layoutField` template aktif:
   - `namaDonatur`: nama donatur dalam huruf kapital semua
   - `deskripsiWakaf`: teks berformat "[namaProgram] berupa [Barang/Uang]"
   - `jumlahTerbilang`: nilai `jumlahTerbilang` dari transaksi
   - `noSertifikat`: teks berformat "No: [noSertifikat]"
   - `tanggalTerbit`: tanggal terbit dalam format Indonesia (contoh: "29 Agustus 2026")
10. WHEN PDF berhasil digenerate, THE Server SHALL menyimpan file PDF ke path `storage/sertifikat/[noTransaksi].pdf` dan menyimpan record sertifikat baru ke Database dengan status `terbit`.
11. WHEN record sertifikat berhasil dibuat, THE Server SHALL mengembalikan data sertifikat dalam format `ApiResponse<Sertifikat>` dengan kode HTTP 201.
12. IF transaksi sudah memiliki sertifikat yang diterbitkan di Database, THEN THE Server SHALL mengembalikan respons HTTP 409 dengan pesan "Sertifikat untuk transaksi ini sudah pernah diterbitkan".
13. THE Nomor_Generator SHALL menghasilkan `noSertifikat` yang unik di antara seluruh sertifikat yang tersimpan di Database dalam bulan yang sama.

---

### Persyaratan 6: Manajemen Template Sertifikat

**User Story:** Sebagai superadmin, saya ingin mengelola template sertifikat termasuk background image dan koordinat field, agar tampilan sertifikat dapat disesuaikan tanpa mengubah kode.

#### Kriteria Penerimaan

1. THE Sistem SHALL menyimpan template sertifikat dengan atribut: nama template, path file background, `layoutField` (JSON koordinat field), referensi ke dua penandatangan, dan status aktif.
2. WHEN superadmin mengirimkan data template baru yang valid ke `POST /template`, THE Server SHALL menyimpan template ke Database dan mengembalikan data template termasuk `id` dalam format `ApiResponse<TemplateSertifikat>` dengan kode HTTP 201.
3. THE Sistem SHALL memastikan bahwa hanya satu template yang memiliki status `aktif = true` pada satu waktu.
4. WHEN superadmin mengaktifkan sebuah template melalui `PATCH /template/:id/aktif`, THE Server SHALL mengubah status semua template lain menjadi `aktif = false` sebelum mengaktifkan template yang diminta.
5. WHEN superadmin mengirimkan `layoutField` JSON, THE Server SHALL memvalidasi bahwa objek JSON tersebut mengandung setidaknya field `namaDonatur`, `deskripsiWakaf`, `jumlahTerbilang`, `noSertifikat`, `tanggalTerbit`, `canvasWidth`, dan `canvasHeight`.
6. IF `layoutField` yang dikirimkan tidak memiliki salah satu field wajib tersebut, THEN THE Server SHALL mengembalikan respons HTTP 400 dengan daftar field yang tidak lengkap.
7. WHEN superadmin mengirimkan permintaan daftar template ke `GET /template`, THE Server SHALL mengembalikan seluruh template yang tersimpan beserta data penandatangan yang terkait.

---

### Persyaratan 7: Manajemen Penandatangan

**User Story:** Sebagai superadmin, saya ingin mengelola data penandatangan sertifikat, agar informasi penandatangan dapat diperbarui tanpa mengubah desain background.

#### Kriteria Penerimaan

1. THE Sistem SHALL menyimpan data penandatangan dengan atribut: nama (wajib), jabatan (wajib), path file tanda tangan PNG transparan, dan status aktif.
2. WHEN superadmin mengirimkan data penandatangan baru yang valid ke `POST /penandatangan`, THE Server SHALL menyimpan data ke Database dan mengembalikan record penandatangan dalam format `ApiResponse<Penandatangan>` dengan kode HTTP 201.
3. WHEN superadmin mengirimkan permintaan daftar penandatangan ke `GET /penandatangan`, THE Server SHALL mengembalikan seluruh penandatangan yang tersimpan di Database.
4. WHEN superadmin mengirimkan permintaan update penandatangan ke `PUT /penandatangan/:id` dengan data yang valid, THE Server SHALL memperbarui data penandatangan di Database dan mengembalikan data terbaru.

---

### Persyaratan 8: Akses dan Unduh Sertifikat

**User Story:** Sebagai admin, saya ingin mengunduh dan mengirimkan sertifikat kepada donatur, agar donatur dapat menerima bukti wakaf mereka secara digital.

#### Kriteria Penerimaan

1. WHEN pengguna mengirimkan permintaan `GET /sertifikat/:id`, THE Server SHALL mengembalikan data sertifikat beserta data transaksi dan donatur terkait dalam format `ApiResponse<SertifikatDetail>`.
2. IF sertifikat dengan `id` yang diminta tidak ada di Database, THEN THE Server SHALL mengembalikan respons HTTP 404 dengan pesan "Sertifikat tidak ditemukan".
3. WHEN pengguna mengirimkan permintaan `GET /sertifikat/:id/download`, THE Server SHALL mengembalikan file PDF sertifikat dari path `filePath` yang tersimpan dengan header `Content-Disposition: attachment; filename="[noSertifikat].pdf"`.
4. IF file PDF yang dirujuk oleh `filePath` tidak ditemukan di sistem file, THEN THE Server SHALL mengembalikan respons HTTP 404 dengan pesan "File sertifikat tidak ditemukan".
5. WHEN admin memperbarui status sertifikat ke `dikirim` melalui `PATCH /sertifikat/:id/status`, THE Server SHALL memperbarui field `status` dan `dikirimVia` di Database dan mengembalikan data sertifikat terbaru.
6. WHERE fitur pengiriman WhatsApp diaktifkan, THE Client SHALL membuka tautan `https://wa.me/[noHpDonatur]?text=[pesanEncoded]` pada tab baru, di mana `pesanEncoded` berisi teks pesan yang menyertakan tautan unduh sertifikat.
7. WHEN admin mengirimkan permintaan daftar sertifikat ke `GET /sertifikat`, THE Server SHALL mengembalikan daftar sertifikat beserta ringkasan data transaksi dan donatur terkait, diurutkan berdasarkan `tanggalTerbit` terbaru.

---

### Persyaratan 9: Generator Nomor Sekuensial

**User Story:** Sebagai sistem, saya ingin menghasilkan nomor transaksi dan sertifikat yang unik dan berurutan, agar setiap dokumen dapat diidentifikasi dengan mudah.

#### Kriteria Penerimaan

1. THE Nomor_Generator SHALL menerima parameter prefix (`TRX` atau `CERT`) dan menghasilkan nomor berformat `[PREFIX]/[YYYY]/[MM]/[NNNNN]`.
2. WHEN Nomor_Generator dipanggil untuk prefix dan bulan tertentu, THE Nomor_Generator SHALL menghitung nomor urut berikutnya berdasarkan jumlah record yang ada di Database pada bulan dan tahun yang sama.
3. THE Nomor_Generator SHALL menghasilkan nomor urut dengan padding nol di kiri hingga panjang 5 digit (contoh: urutan ke-1 menghasilkan `00001`, urutan ke-100 menghasilkan `00100`).
4. WHEN dua permintaan pembuatan transaksi atau sertifikat terjadi secara bersamaan pada bulan yang sama, THE Nomor_Generator SHALL menghasilkan nomor yang berbeda untuk setiap permintaan sehingga tidak ada duplikasi.

---

### Persyaratan 10: Konversi Terbilang

**User Story:** Sebagai sistem, saya ingin mengonversi angka jumlah wakaf ke teks bahasa Indonesia, agar sertifikat mencantumkan jumlah dalam bentuk yang mudah dibaca.

#### Kriteria Penerimaan

1. WHEN Terbilang_Converter dipanggil dengan nilai angka bulat positif, THE Terbilang_Converter SHALL menghasilkan representasi teks bahasa Indonesia dari angka tersebut dengan kata "Rupiah" di akhir (contoh: `500000` → "Lima Ratus Ribu Rupiah").
2. WHEN Terbilang_Converter dipanggil dengan nilai `0`, THE Terbilang_Converter SHALL menghasilkan teks "Nol Rupiah".
3. THE Terbilang_Converter SHALL mendukung konversi angka hingga nilai `999.999.999.999` (sembilan ratus sembilan puluh sembilan miliar sembilan ratus sembilan puluh sembilan juta sembilan ratus sembilan puluh sembilan ribu sembilan ratus sembilan puluh sembilan).
4. IF Terbilang_Converter dipanggil dengan nilai negatif atau bukan angka, THEN THE Terbilang_Converter SHALL mengembalikan error yang menjelaskan bahwa nilai tidak valid.
5. THE Terbilang_Converter SHALL menghasilkan teks dengan huruf kapital di awal setiap kata (Title Case).
6. FOR ALL angka bulat positif `n` dalam rentang 1 hingga 999.999.999.999, memparse `jumlahTerbilang` yang dihasilkan dari `n` dan mengonversinya kembali ke angka SHALL menghasilkan nilai yang setara dengan `n` (round-trip property).

---

### Persyaratan 11: Antarmuka Client dan Navigasi

**User Story:** Sebagai pengguna, saya ingin mengakses semua fungsi aplikasi melalui antarmuka web yang responsif, agar pekerjaan administrasi dapat dilakukan dengan efisien.

#### Kriteria Penerimaan

1. THE Client SHALL menyediakan halaman `DonaturPage` yang menampilkan tabel daftar donatur dan formulir untuk menambah serta mengedit donatur.
2. THE Client SHALL menyediakan halaman `TransaksiPage` yang menampilkan tabel daftar transaksi dengan informasi donatur dan program terkait, serta formulir untuk mencatat transaksi baru.
3. THE Client SHALL menyediakan halaman `SertifikatPage` yang menampilkan daftar sertifikat yang sudah diterbitkan dan tombol untuk generate sertifikat baru dari transaksi yang tersedia.
4. THE Client SHALL menyediakan halaman `TemplateEditorPage` yang dapat diakses oleh superadmin untuk mengelola template sertifikat dan koordinat layout field.
5. WHEN pengguna mengklik tombol "Buat Sertifikat" pada `SertifikatPage` untuk transaksi yang belum memiliki sertifikat, THE Client SHALL mengirimkan permintaan `POST /sertifikat/generate/:transaksiId` ke Server dan menampilkan hasil atau pesan error kepada pengguna.
6. WHEN Server mengembalikan data sertifikat yang berhasil dibuat, THE Client SHALL menampilkan tautan unduh PDF sertifikat dan tombol "Kirim via WhatsApp" kepada pengguna.
7. WHILE Client sedang menunggu respons dari Server (loading state), THE Client SHALL menampilkan indikator loading dan menonaktifkan tombol aksi untuk mencegah permintaan duplikat.
8. IF Server mengembalikan respons error, THE Client SHALL menampilkan pesan error yang informatif kepada pengguna tanpa menampilkan detail teknis internal.
9. THE Client SHALL menggunakan tipe data dari package `shared` sebagai satu-satunya sumber definisi struktur data yang dipertukarkan antara Client dan Server.
