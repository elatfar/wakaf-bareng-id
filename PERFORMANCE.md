# Login dan unduhan sertifikat

## Perubahan

- Halaman admin dipecah menjadi lazy-loaded chunks, sehingga login tidak perlu memuat seluruh editor dan halaman transaksi.
- `/api/program/statistik/summary` memakai satu agregasi SQL, menggantikan 1 + N query dan pengiriman seluruh transaksi ke Worker. Program aktif tanpa transaksi tetap disertakan dengan nilai nol.
- Login mengirim `Server-Timing` untuk `db`, `password`, dan `token`. Lihat Network > respons login di DevTools. Ini durasi wall-clock, bukan pengukuran CPU Worker. Kekuatan bcrypt tidak diturunkan.
- Renderer menghapus fontkit yang tidak dipakai oleh font Helvetica standar, serta cache PDFDocument global yang menahan dokumen terakhir.
- Cache hanya menyimpan PDF background tanpa data donatur: maksimal 8 MiB / 4 entri per isolate, TTL 60 detik. Setiap download memuat dokumen terpisah dan menambahkan teks terbaru. Perubahan gambar pada URL yang sama dapat tertunda sampai TTL habis; gunakan URL berversi untuk pembaruan segera.
- Pembacaan gambar dibatasi 5 MiB, termasuk respons chunked dan data URL. Timeout fetch 5 detik mencakup pembacaan body. PNG dibatasi 4 juta piksel sebelum decode untuk mengurangi risiko alokasi buffer besar.
- Timer 15 detik di route cetak dihapus: sebelumnya signal tidak diteruskan ke operasi apa pun dan tidak menghentikan render CPU.

## Hasil lokal

Pengujian Bun dengan `storage/backgrounds/BG-Sertifikat.png` (2000 × 1414, 1.865.073 byte), enam render berurutan, fetch dimock untuk mengisolasi pekerjaan renderer:

| Pengukuran | Sebelum | Sesudah |
|---|---:|---:|
| Render pertama | 908 ms | 885 ms |
| Lima render berikutnya | 682–843 ms | 7–14 ms |
| Ukuran PDF | 1.860.871 byte | 1.861.757 byte |
| Bundle server minified, Bun target browser | 2,10 MB | 1,35 MB |

Ini benchmark wall-clock lokal, bukan jaminan latency jaringan atau CPU produksi. Cache bersifat best-effort dan tidak dibagi antar-isolate. Cache miss, restart, dan request bersamaan tetap perlu memproses gambar.

Validasi: `bun test server/tests/pdf.test.ts`, kompilasi TypeScript server dan client, serta build Vite. Tests memeriksa PDF satu halaman, dimensi dan teks donatur, isolasi cache, TTL, perubahan canvas, oversized streams/base64, batas piksel, dan retry setelah fetch gagal.

## Verifikasi produksi

1. Periksa `Server-Timing` login pertama setelah idle dan login berikutnya. `db` dominan menunjukkan waktu database/network; `password` dominan menunjukkan biaya bcrypt. Jangan menurunkan cost password untuk mengejar limit.
2. Catat CPU time, wall time, dan outcome Worker untuk download pertama dan berulang. Error 1102 dapat berasal dari CPU atau memori. Batas lokal tidak sama dengan deployment: https://developers.cloudflare.com/workers/platform/limits/
3. Gunakan JPG untuk background bila memungkinkan: JPG di-embed tanpa decode seluruh piksel seperti PNG. PNG pertama masih mahal; optimasi cache tidak menjamin lolos CPU limit paket Free. Jika masih melampaui batas, evaluasi render di browser atau layanan/job renderer terpisah. Perubahan infrastruktur tersebut belum diterapkan.
4. Cocokkan ringkasan SQL terhadap data program aktif dengan transaksi terverifikasi, pending, batal, dan tanpa transaksi. Tidak ada akses database produksi atau pengukuran query plan dalam pengujian lokal ini.

Catatan: hitungan/total lain di dashboard masih menggunakan daftar berhalaman yang sudah ada; perbaikan metrik keseluruhan memerlukan endpoint agregasi dashboard tersendiri.
