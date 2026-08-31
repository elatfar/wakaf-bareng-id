export interface Program {
  id: number;
  namaProgram: string;
  deskripsi: string | null;
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
