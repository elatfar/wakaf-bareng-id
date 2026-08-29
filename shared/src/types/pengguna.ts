export type Role = "superadmin" | "admin" | "kasir";

export interface Pengguna {
  id: number;
  nama: string;
  email: string;
  role: Role;
}

export interface BuatPenggunaInput {
  nama: string;
  email: string;
  password: string;
  role: Role;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  pengguna: Pengguna;
}
