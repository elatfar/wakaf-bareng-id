export interface Donatur {
  id: number;
  nama: string;
  noHp: string | null;
  email: string | null;
  alamat: string | null;
  nik: string | null;
  createdAt: string;
}

export interface BuatDonaturInput {
  nama: string;
  noHp?: string;
  email?: string;
  alamat?: string;
  nik?: string;
}
