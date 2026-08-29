import type { Donatur } from "./donatur";
import type { Program } from "./program";

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
