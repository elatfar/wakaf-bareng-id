export type TipeDana = "wakaf" | "zakat";

export interface Program {
  id: number;
  namaProgram: string;
  deskripsi: string | null;
  tipe: TipeDana;
  targetDana: number | null;
  aktif: boolean;
  tanggalMulai: string | null;
  tanggalSelesai: string | null;
  kategori: string | null;
  prioritas: number;
  createdAt: string | null;
}

export interface BuatProgramInput {
  namaProgram: string;
  tipe: TipeDana;
  deskripsi?: string;
  targetDana?: number;
  tanggalMulai?: string;
  tanggalSelesai?: string;
  kategori?: string;
  prioritas?: number;
}

export interface ProgramStats {
  programId: number;
  totalDonatur: number;
  totalTerkumpul: number;
  targetDana: number | null;
  progressPersen: number;
  transaksiTerakhir: string | null;
  rataRataDonasi: number;
}
