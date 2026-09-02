import type { Donatur } from "./donatur";
import type { Program, TipeDana } from "./program";

export interface Transaksi {
  id: number;
  noTransaksi: string;
  donaturId: number;
  programId: number;
  tipe: TipeDana;
  jenis: "uang" | "barang";
  deskripsiBarang: string | null;
  jumlah: number;
  jumlahTerbilang: string;
  metodePembayaran: string | null;
  tanggal: string;
  status: "pending" | "terverifikasi" | "batal";
  dicatatOleh?: number | null;
  catatan: string | null;
  createdAt: string;
}

export interface TransaksiDetail extends Omit<Transaksi, "dicatatOleh"> {
  donatur: Pick<Donatur, "id" | "nama" | "noHp">;
  program: Pick<Program, "id" | "namaProgram" | "tipe">;
  dicatatOleh?: { id: number; nama: string; email: string; role: string } | null;
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
