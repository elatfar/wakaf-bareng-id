export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
}

export * from "./donatur";
export * from "./program";
export * from "./pengguna";
export * from "./penandatangan";
export * from "./transaksi";
export * from "./sertifikat";
export * from "./template";
