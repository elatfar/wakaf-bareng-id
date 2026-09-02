export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
}

/** Inner payload of a paginated API response (nested inside ApiResponse.data). */
export interface PaginatedData<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * @deprecated Use ApiResponse<PaginatedData<T>> instead.
 * Kept for backwards compatibility.
 */
export interface PaginatedResponse<T> {
  success: boolean;
  message: string;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export * from "./donatur";
export * from "./program";
export * from "./pengguna";
export * from "./penandatangan";
export * from "./transaksi";
export * from "./sertifikat";
export * from "./template";
