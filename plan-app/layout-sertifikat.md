# Struktur Posisi Field — Background `BG-Sertifikat.png`

Background: **2000 × 1414 px**. Semua koordinat di bawah dalam px terhadap ukuran asli ini (top-left origin, y ke bawah — standar HTML/gambar).

## 1. Peta Field

| Field | x (center) | y (center) | Font size | Align | Catatan |
|---|---|---|---|---|---|
| `nama_donatur` | 1000 | 720 | 58px, bold | center | di ruang kosong atas garis merah |
| `deskripsi_wakaf` | 1000 | 900 | 36px | center | mis. "wakaf air sehat berupa ~~Barang~~/Uang" |
| `jumlah_terbilang` | 1000 | 955 | 34px, semi-bold | center | mis. "Lima Ratus Ribu Rupiah" |
| `no_sertifikat` | 1820 | 1345 | 22px | right | opsional, pojok kanan-bawah (area putih bersih) |
| `tanggal_terbit` | 1820 | 1375 | 22px | right | opsional |

**Elemen statis** (sudah tercetak di background, tidak digenerate ulang): logo yayasan, judul "CERTIFICATE", paragraf pembuka, garis pembatas merah (y=805), nama & jabatan kedua penandatangan, gambar tanda tangan.

**Area terlarang**: pojok kiri-bawah (x < 400, y > 1250) — ada dekorasi merah-emas, jangan taruh teks di situ.

## 2. JSON `layoutField` (disimpan di tabel `template_sertifikat`)

```json
{
  "namaDonatur": { "x": 1000, "y": 720, "size": 58, "align": "center", "bold": true },
  "deskripsiWakaf": { "x": 1000, "y": 900, "size": 36, "align": "center", "bold": false },
  "jumlahTerbilang": { "x": 1000, "y": 955, "size": 34, "align": "center", "bold": true },
  "noSertifikat": { "x": 1820, "y": 1345, "size": 22, "align": "right", "bold": false },
  "tanggalTerbit": { "x": 1820, "y": 1375, "size": 22, "align": "right", "bold": false },
  "canvasWidth": 2000,
  "canvasHeight": 1414
}
```

## 3. Preview HTML

File `preview-sertifikat.html` (satu folder dengan `assets/BG-Sertifikat.png`) menampilkan overlay di atas background memakai posisi **persentase** (dikonversi dari px asli), jadi tetap presisi di layar berapa pun ukurannya:

```
top(%)  = y_px / 1414 * 100
left(%) = x_px / 2000 * 100
```

Buka file itu di browser untuk melihat langsung posisi tiap field terhadap background.

## 4. Update `server/src/lib/pdf.ts` (pdf-lib)

pdf-lib pakai origin **kiri-bawah**, jadi y harus dibalik: `y_pdf = pageHeight - y_top`. Jika background dipakai sebagai gambar (PNG) yang di-embed ke halaman PDF baru (bukan PDF template siap pakai), berikut versinya:

```ts
// server/src/lib/pdf.ts
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import fs from "node:fs/promises";

const CANVAS_W = 2000;
const CANVAS_H = 1414;

function centerX(text: string, fontSize: number, font: any, xCenter: number) {
  const width = font.widthOfTextAtSize(text, fontSize);
  return xCenter - width / 2;
}

function rightAlignX(text: string, fontSize: number, font: any, xRight: number) {
  const width = font.widthOfTextAtSize(text, fontSize);
  return xRight - width;
}

export async function renderSertifikatPDF(trx: any, template: any) {
  const layout = typeof template.layoutField === "string"
    ? JSON.parse(template.layoutField)
    : template.layoutField;

  const bgBytes = await fs.readFile(template.fileBackground); // BG-Sertifikat.png
  const pdfDoc = await PDFDocument.create();
  const bgImage = await pdfDoc.embedPng(bgBytes);

  const page = pdfDoc.addPage([CANVAS_W, CANVAS_H]);
  page.drawImage(bgImage, { x: 0, y: 0, width: CANVAS_W, height: CANVAS_H });

  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const draw = (key: string, text: string) => {
    const f = layout[key];
    if (!f) return;
    const font = f.bold ? fontBold : fontRegular;
    const yPdf = CANVAS_H - f.y; // flip origin
    let x = f.x;
    if (f.align === "center") x = centerX(text, f.size, font, f.x);
    if (f.align === "right") x = rightAlignX(text, f.size, font, f.x);

    page.drawText(text, { x, y: yPdf, size: f.size, font, color: rgb(0.05, 0.05, 0.05) });
  };

  draw("namaDonatur", trx.namaDonatur.toUpperCase());
  draw("deskripsiWakaf", `${trx.namaProgram} berupa ${trx.jenis === "barang" ? "Barang" : "Uang"}`);
  draw("jumlahTerbilang", trx.jumlahTerbilang);
  draw("noSertifikat", `No: ${trx.noSertifikat}`);
  draw("tanggalTerbit", formatTanggalIndo(trx.tanggalTerbit));

  const outPath = `storage/sertifikat/${trx.noTransaksi}.pdf`;
  await fs.writeFile(outPath, await pdfDoc.save());
  return outPath;
}

function formatTanggalIndo(iso: string) {
  const bulan = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
  const d = new Date(iso);
  return `${d.getDate()} ${bulan[d.getMonth()]} ${d.getFullYear()}`;
}
```

> Catatan strikethrough (mis. "~~Barang~~/Uang" pada contoh terisi): pdf-lib tidak punya style coret bawaan — kalau perlu, gambar garis tipis manual (`page.drawLine`) tepat di atas kata yang dicoret, panjangnya dihitung dari `font.widthOfTextAtSize`.

## 5. Yang Perlu Disiapkan Selanjutnya

1. Konfirmasi apakah field `no_sertifikat` & `tanggal_terbit` memang mau ditambahkan (belum ada di desain asli, saya usulkan taruh di pojok kanan-bawah yang kosong).
2. Kalau tulisan "Barang/Uang" perlu dicoret sesuai jenis transaksi, konfirmasi logika: coret "Barang" jika `jenis = uang`, dan sebaliknya.
3. Font asli sertifikat sepertinya bukan Helvetica standar (headingnya pakai font serif dekoratif) — kalau ingin font nama donatur meniru gaya body text certificate, perlu embed font custom (`.ttf`) ke pdf-lib pakai `pdfDoc.embedFont(fontBytes)` dari `@pdf-lib/fontkit`.