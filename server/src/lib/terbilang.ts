/**
 * lib/terbilang.ts
 * Konversi angka rupiah ke teks bahasa Indonesia Title Case.
 */

const SATUAN = [
  "", "Satu", "Dua", "Tiga", "Empat", "Lima",
  "Enam", "Tujuh", "Delapan", "Sembilan", "Sepuluh",
  "Sebelas", "Dua Belas", "Tiga Belas", "Empat Belas", "Lima Belas",
  "Enam Belas", "Tujuh Belas", "Delapan Belas", "Sembilan Belas",
];

const PULUHAN = [
  "", "", "Dua Puluh", "Tiga Puluh", "Empat Puluh", "Lima Puluh",
  "Enam Puluh", "Tujuh Puluh", "Delapan Puluh", "Sembilan Puluh",
];

/**
 * Konversi nilai 0–999 ke teks bahasa Indonesia.
 * Mengembalikan string kosong untuk nilai 0.
 */
function ratusan(n: number): string {
  if (n === 0) return "";

  const parts: string[] = [];

  const ratus = Math.floor(n / 100);
  const sisa = n % 100;

  if (ratus === 1) {
    parts.push("Seratus");
  } else if (ratus > 1) {
    parts.push(SATUAN[ratus]! + " Ratus");
  }

  if (sisa < 20) {
    if (sisa > 0) parts.push(SATUAN[sisa]!);
  } else {
    const puluh = Math.floor(sisa / 10);
    const satuan = sisa % 10;
    parts.push(PULUHAN[puluh]!);
    if (satuan > 0) parts.push(SATUAN[satuan]!);
  }

  return parts.join(" ");
}

/**
 * Konversi angka bulat 0 – 999.999.999.999 ke teks bahasa Indonesia Title Case,
 * diakhiri dengan kata " Rupiah".
 *
 * Kasus khusus:
 *   0        → "Nol Rupiah"
 *   1.000    → "Seribu Rupiah"  (bukan "Satu Ribu Rupiah")
 *   1.100    → "Seribu Seratus Rupiah"
 *   1.001.000 → "Satu Juta Satu Ribu Rupiah"  (satuan nol di tengah tidak disebut)
 *
 * "Seribu" hanya berlaku jika tidak ada grup miliar/juta (n < 2.000),
 * sesuai kaidah bahasa Indonesia baku.
 *
 * @throws {RangeError} Jika n < 0, bukan integer, atau > 999.999.999.999
 */
export function angkaKeTerbilang(n: number): string {
  if (!Number.isInteger(n)) {
    throw new RangeError(`angkaKeTerbilang: input bukan integer (${n})`);
  }
  if (n < 0) {
    throw new RangeError(`angkaKeTerbilang: input negatif (${n})`);
  }
  if (n > 999_999_999_999) {
    throw new RangeError(`angkaKeTerbilang: input melebihi 999.999.999.999 (${n})`);
  }

  if (n === 0) return "Nol Rupiah";

  const parts: string[] = [];

  // Miliar (0–999)
  const miliar = Math.floor(n / 1_000_000_000);
  const sisaMiliar = n % 1_000_000_000;

  if (miliar > 0) {
    parts.push(ratusan(miliar) + " Miliar");
  }

  // Juta (0–999)
  const juta = Math.floor(sisaMiliar / 1_000_000);
  const sisaJuta = sisaMiliar % 1_000_000;

  if (juta > 0) {
    parts.push(ratusan(juta) + " Juta");
  }

  // Ribu (0–999)
  const ribu = Math.floor(sisaJuta / 1_000);
  const sisaRibu = sisaJuta % 1_000;

  if (ribu > 0) {
    // "Seribu" hanya dipakai jika tidak ada grup yang lebih besar (miliar/juta)
    if (ribu === 1 && miliar === 0 && juta === 0) {
      parts.push("Seribu");
    } else {
      parts.push(ratusan(ribu) + " Ribu");
    }
  }

  // Satuan (0–999)
  if (sisaRibu > 0) {
    parts.push(ratusan(sisaRibu));
  }

  return parts.join(" ") + " Rupiah";
}
