export interface Program {
  id: number;
  namaProgram: string;
  deskripsi: string | null;
  aktif: boolean;
}

export interface BuatProgramInput {
  namaProgram: string;
  deskripsi?: string;
}
