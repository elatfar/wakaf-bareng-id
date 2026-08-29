export interface Penandatangan {
  id: number;
  nama: string;
  jabatan: string;
  fileTtd: string | null;
  aktif: boolean;
}

export interface BuatPenandatanganInput {
  nama: string;
  jabatan: string;
  fileTtd?: string;
}
