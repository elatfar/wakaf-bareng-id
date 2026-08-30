# Plan UI/UX — Aplikasi Pencatatan Wakaf & Sertifikat
### Mengikuti pola desain & komponen ala **Ayobantu.com**, tema **Megah Burgundy-Gold**

## 1. Referensi Desain: Pola yang Diambil dari Ayobantu.com

Ayobantu.com adalah platform donasi publik (donatur browsing campaign), sedangkan aplikasi kita bersifat **internal/admin** (mencatat penerimaan + generate sertifikat). Karena itu, yang diadopsi bukan seluruh halaman publiknya, melainkan **pola UX & komponennya**:

| Pola di Ayobantu.com | Diadaptasi jadi |
|---|---|
| Hero banner carousel di landing page | Ringkasan/stat banner di dashboard admin |
| Kategori favorit (ikon + label: Donasi, Event, Zakat) | Quick action icon di dashboard (Input Transaksi, Donatur Baru, Generate Sertifikat, Laporan) |
| Card campaign dengan progress bar (terkumpul vs target) | Card Program Wakaf dengan progress terkumpul vs target |
| Counter "#TemanPeduli telah berdonasi" & "Dana terkumpul" | Stat counter di dashboard: Total Donatur, Total Transaksi, Total Terkumpul |
| Tombol CTA besar & tegas ("Donasi Sekarang", "Galang Dana") | Tombol utama besar: "Catat Transaksi", "Generate Sertifikat" |
| List/partner logo strip di footer | Info yayasan & badge legalitas di footer app |
| Layout bersih, banyak white space, card rounded + shadow lembut | Dipakai konsisten di semua halaman |

**Prinsip visual yang dipertahankan:** clean & trustworthy (kesan lembaga amal terpercaya), card-based, rounded corners, shadow lembut, CTA jelas dan besar, hierarki tipografi tegas, dan indikator progres visual (bar/percentage) di mana pun relevan.

---

## 2. Arah Visual (Design Tokens) — Tema Megah Burgundy-Gold

Tema final: **burgundy tua sebagai warna dominan (kesan megah, elegan, khas identitas keagamaan/yayasan)**, dipadu **emas sebagai aksen mewah** (garis pembatas, border card, progress bar). Pola layout & komponen tetap mengikuti gaya Ayobantu (bersih, card, whitespace lega), tapi nuansa warnanya jauh lebih premium dibanding tema maroon-emas versi awal.

| Token | Nilai | Pemakaian |
|---|---|---|
| `--color-primary` | Burgundy `#5C1626` | Navbar, header section, tombol utama |
| `--color-primary-text` | Emas pucat `#F3E4B5` | Teks di atas navbar/header burgundy |
| `--color-accent` | Emas `#C9A227` | Border card, garis divider, progress bar, ikon aktif |
| `--color-accent-soft` | Emas muda `#EFE3C0` | Track/background progress bar |
| `--color-bg-page` | Krem lembut `#FBF7EE` | Background halaman (pengganti putih polos, kesan hangat & megah) |
| `--color-surface` | Putih `#FFFFFF` | Background card |
| `--color-border` | Emas pudar `#E4D4A8` | Border tipis semua card |
| `--color-text-muted` | Cokelat emas `#8A6D2F` | Label kecil, subtitle, meta info |
| `--color-text` | `#2B2B2B` | Teks utama |
| `--color-success` | Hijau `#1FA35A` | Status "Terverifikasi" — **tidak diubah**, tetap hijau supaya makna status tidak tertelan warna brand |
| `--color-warning` | Kuning `#E8A63D` | Status "Pending" |
| `--color-danger` | Merah `#D64545` | Status "Batal", validasi error |
| `--radius-card` | 10–12px | Semua card |
| Border style | `1px solid var(--color-border)` (tanpa shadow) | Kesan flat-elegant, bukan shadow lembut generik |
| Aksen struktural | Garis tipis emas (`border-bottom` navbar, `top strip` di card program) | Sentuhan "megah" ala ornamen sertifikat |
| Font | Poppins / Inter untuk UI; opsional font serif dekoratif hanya untuk judul besar (mis. halaman login) | Konsisten di semua halaman |

**Prinsip penerapan warna:** burgundy dipakai untuk elemen struktural (navbar, tombol utama, strip atas card), emas untuk aksen garis/border/progress — bukan dipakai berbarengan sebagai fill besar di satu elemen (supaya tidak "ramai"). Warna semantik (hijau/kuning/merah status) sengaja tidak diganti emas/burgundy agar tetap mudah dibaca sebagai indikator status.

**Preview**: lihat mockup dashboard bertema ini pada percakapan sebelumnya — navbar burgundy dengan garis bawah emas, stat card & program card putih berbingkai emas tipis, progress bar emas di atas track krem.

---

## 3. Sitemap & Alur Navigasi

*(lihat diagram alur di atas)*

Struktur halaman utama:
1. **Login**
2. **Dashboard** — ringkasan & quick actions
3. **Program Wakaf** — daftar program + progress
4. **Donatur** — daftar & pencarian donatur
5. **Transaksi** — pencatatan penerimaan
6. **Detail Transaksi → Generate Sertifikat**
7. **Sertifikat** — daftar sertifikat terbit, preview, kirim ulang
8. **Laporan** — rekap & export
9. **Pengaturan** — template sertifikat, penandatangan, pengguna

---

## 4. Wireframe per Halaman

### 4.1 Login
```
┌────────────────────────────────────┐
│         [Logo Yayasan]              │
│         Masuk ke Dashboard          │
│  ┌──────────────────────────────┐  │
│  │ Email                        │  │
│  └──────────────────────────────┘  │
│  ┌──────────────────────────────┐  │
│  │ Password                     │  │
│  └──────────────────────────────┘  │
│         [   Masuk   ]  (burgundy)   │
└────────────────────────────────────┘
```
Sederhana, terpusat, logo besar di atas — kesan formal & terpercaya (bukan gaya playful).

---

### 4.2 Dashboard (mengadopsi hero + stats + quick action Ayobantu)
```
┌───────────────────────────────────────────────────────────┐
│  [Logo]   Dashboard   Program   Transaksi   Sertifikat  ⚙  │  ← navbar
├───────────────────────────────────────────────────────────┤
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐          │
│  │ Total        │ │ Total        │ │ Total         │       │ ← stat cards
│  │ Donatur: 128 │ │ Transaksi:342│ │ Terkumpul:Rp..│       │   (ala counter
│  └─────────────┘ └─────────────┘ └─────────────┘          │    "Dana Terkumpul")
│                                                             │
│  Aksi Cepat                                                │
│  [ + Catat Transaksi ]  [ + Donatur Baru ]  [ 🖨 Sertifikat]│ ← quick action
│                                                             │   ala ikon kategori
│  Program Wakaf Aktif                        [Lihat Semua]  │
│  ┌───────────┐ ┌───────────┐ ┌───────────┐                │
│  │ Wakaf Air  │ │ Wakaf     │ │ Wakaf      │               │ ← card program
│  │ Sehat      │ │ Al-Qur'an │ │ Pendidikan │               │   dgn progress bar
│  │ ▓▓▓▓▓░░ 68%│ │ ▓▓▓░░░ 40%│ │ ▓▓▓▓▓▓▓ 90%│               │
│  │ Rp68jt/100jt│ │Rp40jt/100jt│ │Rp90jt/100jt│              │
│  └───────────┘ └───────────┘ └───────────┘                │
│                                                             │
│  Transaksi Terbaru                                         │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ Nama       Program        Jumlah      Status  Aksi   │  │ ← tabel ringkas
│  │ Sigit A.   Wakaf Air Sehat Rp500.000  ✅       [•••] │  │
│  └─────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────┘
```

---

### 4.3 Program Wakaf (daftar) — ala grid campaign card Ayobantu
```
┌───────────────────────────────────────────────────────────┐
│  Program Wakaf                         [+ Tambah Program]  │
│  [Cari program...]        [Filter: Semua ▾]                │
│                                                             │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐              │
│  │ (gambar)   │  │ (gambar)   │  │ (gambar)   │             │
│  │ Wakaf Air  │  │ Wakaf      │  │ Wakaf      │             │
│  │ Sehat      │  │ Al-Qur'an  │  │ Pendidikan │             │
│  │ ▓▓▓▓▓░ 68% │  │ ▓▓▓░░░ 40% │  │ ▓▓▓▓▓▓▓90% │             │
│  │ 214 donatur│  │ 98 donatur │  │ 301 donatur│             │
│  │ [Detail]   │  │ [Detail]   │  │ [Detail]   │             │
│  └───────────┘  └───────────┘  └───────────┘              │
└───────────────────────────────────────────────────────────┘
```
Card ini identik pola dengan card campaign Ayobantu: gambar/ikon di atas, judul, progress bar, meta info (jumlah donatur), tombol aksi di bawah.

---

### 4.4 Transaksi — Form Input Pencatatan Penerimaan
```
┌───────────────────────────────────────────────────────────┐
│  Catat Transaksi Baru                                      │
│  ┌─────────────────────────────┐                           │
│  │ Donatur       [🔍 Cari/Tambah Baru]                     │
│  │ Program       [Wakaf Air Sehat ▾]                       │
│  │ Jenis         (•) Uang   ( ) Barang                     │
│  │ Jumlah        [Rp __________]                           │
│  │ → Terbilang: "Lima Ratus Ribu Rupiah" (otomatis)        │
│  │ Metode        [Transfer ▾]                              │
│  │ Tanggal       [29/08/2026]                               │
│  │ Catatan       [___________________]                     │
│  │                                                          │
│  │        [ Batal ]     [ Simpan Transaksi ]  (burgundy)    │
│  └─────────────────────────────┘                           │
└───────────────────────────────────────────────────────────┘
```
Terbilang otomatis muncul live (helper text), meniru pengalaman form donasi Ayobantu yang menampilkan info tambahan langsung saat isi nominal.

---

### 4.5 Detail Transaksi → Generate Sertifikat
```
┌───────────────────────────────────────────────────────────┐
│  Transaksi #TRX/2026/08/00123               Status: ✅     │
│  ┌───────────────────────────┐  ┌─────────────────────┐   │
│  │ Donatur: Sigit Ariwibowo  │  │  [Preview Sertifikat]│   │
│  │ Program: Wakaf Air Sehat  │  │   (thumbnail PDF)    │   │
│  │ Jumlah : Rp500.000        │  │                       │   │
│  │ Terbilang: Lima Ratus...  │  │  [ Generate Sertifikat]│  │
│  │ Tanggal: 29 Agt 2026      │  │  [ Kirim via Email ]  │   │
│  └───────────────────────────┘  │  [ Kirim via WhatsApp]│   │
│                                  │  [ Download PDF ]     │   │
│                                  └─────────────────────┘   │
└───────────────────────────────────────────────────────────┘
```

---

### 4.6 Daftar Sertifikat
```
┌───────────────────────────────────────────────────────────┐
│  Sertifikat Terbit                                          │
│  [Cari no. sertifikat / nama donatur]     [Filter Tanggal ▾]│
│  ┌─────────────────────────────────────────────────────┐   │
│  │ No. Sertifikat   Donatur    Program     Status  Aksi │   │
│  │ CERT/2026/08/001 Sigit A.   Wakaf Air.. Terkirim [👁][⬇]│  │
│  │ CERT/2026/08/002 Budi S.    Wakaf Qur'an Draft   [👁][⬇]│  │
│  └─────────────────────────────────────────────────────┘   │
└───────────────────────────────────────────────────────────┘
```

---

### 4.7 Laporan
```
┌───────────────────────────────────────────────────────────┐
│  Laporan Penerimaan                                         │
│  [Dari: 01/08/2026] [Sampai: 29/08/2026] [Program: Semua▾] │
│                                                              │
│  [ Grafik batang: Penerimaan per Program ]                  │
│  [ Grafik garis: Tren Penerimaan Harian ]                    │
│                                                              │
│  Total Penerimaan: Rp 245.000.000        [Export Excel]     │
└───────────────────────────────────────────────────────────┘
```

---

## 5. Komponen UI Reusable

| Komponen | Deskripsi | Dipakai di |
|---|---|---|
| `StatCard` | Angka besar + label + ikon | Dashboard |
| `ProgramCard` | Gambar/ikon, judul, progress bar, meta info | Dashboard, Program Wakaf |
| `ProgressBar` | Bar dengan warna dinamis (hijau jika ≥70%, kuning <70%) | ProgramCard, Laporan |
| `DataTable` | Tabel + search + filter + pagination | Donatur, Transaksi, Sertifikat |
| `StatusBadge` | Pill kecil berwarna (Terverifikasi/Pending/Batal) | Transaksi, Sertifikat |
| `QuickActionButton` | Ikon + label, card kecil dengan shadow | Dashboard |
| `PDFPreviewModal` | Modal menampilkan preview sertifikat sebelum kirim | Detail Transaksi |
| `Toast` | Notifikasi sukses/gagal di pojok kanan atas | Semua form |
| `EmptyState` | Ilustrasi + teks saat data kosong | Semua list |

---

## 6. Responsive Behavior

- **Desktop (≥1024px)**: sidebar/navbar horizontal seperti Ayobantu, grid card 3 kolom.
- **Tablet (768–1023px)**: grid card 2 kolom, navbar tetap horizontal (collapse jadi hamburger jika perlu).
- **Mobile (≤767px)**: navbar jadi hamburger menu, card program jadi 1 kolom (scroll vertikal), tabel transaksi berubah jadi list card (bukan tabel horizontal) — pola umum admin-app mobile-friendly.

---

## 7. Micro-interaction & Kepercayaan (Trust Signals)

Ayobantu banyak menonjolkan elemen kepercayaan (izin Kemensos, partner logo, transparansi). Diterapkan di app ini sebagai:
- Footer dashboard menampilkan No. Izin Yayasan (jika ada) & data legal.
- Badge "Terverifikasi" hijau pada tiap transaksi tervalidasi.
- Riwayat aktivitas (log) di detail transaksi: "Dicatat oleh Admin X pada tanggal Y" — transparansi internal.
- Preview sertifikat sebelum kirim, supaya admin bisa cek dulu sebelum donatur menerima (mengurangi kesalahan data).

---

## 8. Catatan Implementasi (selaras dengan stack BHVR sebelumnya)

- Gunakan **Tailwind CSS** di client React (Vite), definisikan tema burgundy-gold di `tailwind.config.ts`:
  ```ts
  colors: {
    primary: "#5C1626",       // burgundy
    "primary-text": "#F3E4B5",
    accent: "#C9A227",        // emas
    "accent-soft": "#EFE3C0",
    "bg-page": "#FBF7EE",
    border: "#E4D4A8",
    "text-muted": "#8A6D2F",
    success: "#1FA35A",
    warning: "#E8A63D",
    danger: "#D64545",
  }
  ```
- `ProgramCard` & `StatCard` dibuat sebagai komponen reusable di `client/src/components/`, dengan strip atas burgundy (`border-t-4 border-primary` atau div 6px) sebagai identitas visual card.
- Progress bar % dihitung dari agregat `SUM(transaksi.jumlah)` per `program_id` dibagi target program (perlu tambah kolom `target_dana` di tabel `program`), warna bar pakai `accent` (emas) di atas track `accent-soft`.