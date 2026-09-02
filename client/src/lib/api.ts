import type {
  ApiResponse,
  PaginatedData,
  Donatur, BuatDonaturInput,
  Program, BuatProgramInput, ProgramStats,
  Pengguna, BuatPenggunaInput, LoginInput, LoginResponse,
  Penandatangan, BuatPenandatanganInput,
  TransaksiDetail, BuatTransaksiInput,
  Sertifikat, SertifikatDetail,
  TemplateSertifikatDetail, BuatTemplateInput,
} from "shared";

const BASE_URL = import.meta.env.DEV 
  ? ((import.meta.env.VITE_SERVER_URL as string) || "http://localhost:3000/api")
  : "/api";

function getToken(): string | null {
  return localStorage.getItem("token");
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  const json = await res.json() as ApiResponse<T>;
  return json;
}

// ─── Auth ────────────────────────────────────────────────────────────────────
export const auth = {
  login: (body: LoginInput) =>
    request<LoginResponse>("/auth/login", { method: "POST", body: JSON.stringify(body) }),
};

// ─── Donatur ─────────────────────────────────────────────────────────────────
export const donaturApi = {
  list: (params?: { page?: number; limit?: number; search?: string }) => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append("page", params.page.toString());
    if (params?.limit) queryParams.append("limit", params.limit.toString());
    if (params?.search) queryParams.append("search", params.search);
    const queryString = queryParams.toString();
    return request<PaginatedData<Donatur>>(`/donatur${queryString ? `?${queryString}` : ""}`);
  },
  get: (id: number) => request<Donatur>(`/donatur/${id}`),
  create: (body: BuatDonaturInput) =>
    request<Donatur>("/donatur", { method: "POST", body: JSON.stringify(body) }),
  update: (id: number, body: Partial<BuatDonaturInput>) =>
    request<Donatur>(`/donatur/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  delete: (id: number) =>
    request<void>(`/donatur/${id}`, { method: "DELETE" }),
};

// ─── Program ─────────────────────────────────────────────────────────────────
export const programApi = {
  list: (params?: { page?: number; limit?: number; aktif?: boolean; kategori?: string; search?: string; tipe?: string }) => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append("page", params.page.toString());
    if (params?.limit) queryParams.append("limit", params.limit.toString());
    if (params?.aktif !== undefined) queryParams.append("aktif", params.aktif.toString());
    if (params?.kategori) queryParams.append("kategori", params.kategori);
    if (params?.search) queryParams.append("search", params.search);
    if (params?.tipe) queryParams.append("tipe", params.tipe);
    const queryString = queryParams.toString();
    return request<PaginatedData<Program>>(`/program${queryString ? `?${queryString}` : ""}`);
  },
  get: (id: number) => request<Program>(`/program/${id}`),
  getStats: (id: number) => request<ProgramStats>(`/program/${id}/statistik`),
  getSummary: () => request<any>("/program/statistik/summary"),
  create: (body: BuatProgramInput) =>
    request<Program>("/program", { method: "POST", body: JSON.stringify(body) }),
  update: (id: number, body: Partial<BuatProgramInput>) =>
    request<Program>(`/program/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  setAktif: (id: number, aktif: boolean) =>
    request<Program>(`/program/${id}`, { method: "PATCH", body: JSON.stringify({ aktif }) }),
};

// ─── Pengguna ────────────────────────────────────────────────────────────────
export const penggunaApi = {
  list: (params?: { page?: number; limit?: number }) => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append("page", params.page.toString());
    if (params?.limit) queryParams.append("limit", params.limit.toString());
    const queryString = queryParams.toString();
    return request<PaginatedData<Pengguna>>(`/pengguna${queryString ? `?${queryString}` : ""}`);
  },
  create: (body: BuatPenggunaInput) =>
    request<Pengguna>("/pengguna", { method: "POST", body: JSON.stringify(body) }),
};

// ─── Penandatangan ────────────────────────────────────────────────────────────
export const penandatanganApi = {
  list: () => request<Penandatangan[]>("/penandatangan"),
  create: (body: BuatPenandatanganInput) =>
    request<Penandatangan>("/penandatangan", { method: "POST", body: JSON.stringify(body) }),
  update: (id: number, body: Partial<BuatPenandatanganInput>) =>
    request<Penandatangan>(`/penandatangan/${id}`, { method: "PUT", body: JSON.stringify(body) }),
};

// ─── Transaksi ────────────────────────────────────────────────────────────────
export const transaksiApi = {
  list: (params?: { page?: number; limit?: number; tipe?: string; status?: string; programId?: number }) => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append("page", params.page.toString());
    if (params?.limit) queryParams.append("limit", params.limit.toString());
    if (params?.tipe) queryParams.append("tipe", params.tipe);
    if (params?.status) queryParams.append("status", params.status);
    if (params?.programId) queryParams.append("programId", params.programId.toString());
    const queryString = queryParams.toString();
    return request<PaginatedData<TransaksiDetail>>(`/transaksi${queryString ? `?${queryString}` : ""}`);
  },
  get: (id: number) => request<TransaksiDetail>(`/transaksi/${id}`),
  create: (body: BuatTransaksiInput) =>
    request<TransaksiDetail>("/transaksi", { method: "POST", body: JSON.stringify(body) }),
  updateStatus: (id: number, status: string) =>
    request<TransaksiDetail>(`/transaksi/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
};

// ─── Sertifikat ───────────────────────────────────────────────────────────────
export const sertifikatApi = {
  list: (params?: { page?: number; limit?: number }) => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append("page", params.page.toString());
    if (params?.limit) queryParams.append("limit", params.limit.toString());
    const queryString = queryParams.toString();
    return request<PaginatedData<SertifikatDetail>>(`/sertifikat${queryString ? `?${queryString}` : ""}`);
  },
  get: (id: number) => request<SertifikatDetail>(`/sertifikat/${id}`),
  updateStatus: (id: number, status: string, dikirimVia?: string) =>
    request<Sertifikat>(`/sertifikat/${id}/status`, { method: "PATCH", body: JSON.stringify({ status, dikirimVia }) }),
  // Direct PDF URL by transaksiId — browser navigates to this, triggers download + creates record
  pdfUrlByTrx: (transaksiId: number) => `${BASE_URL}/cetak/${transaksiId}`,
  // Backward compat — download by sertifikat id
  downloadUrl: (id: number) => `${BASE_URL}/sertifikat/${id}/download`,
};

// ─── Template ─────────────────────────────────────────────────────────────────
export const templateApi = {
  list: (params?: { page?: number; limit?: number }) => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append("page", params.page.toString());
    if (params?.limit) queryParams.append("limit", params.limit.toString());
    const queryString = queryParams.toString();
    return request<PaginatedData<TemplateSertifikatDetail>>(`/template${queryString ? `?${queryString}` : ""}`);
  },
  get: (id: number) => request<TemplateSertifikatDetail>(`/template/${id}`),
  create: (body: BuatTemplateInput) =>
    request<TemplateSertifikatDetail>("/template", { method: "POST", body: JSON.stringify(body) }),
  update: (id: number, body: Partial<BuatTemplateInput>) =>
    request<TemplateSertifikatDetail>(`/template/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  setAktif: (id: number) =>
    request<TemplateSertifikatDetail>(`/template/${id}/aktif`, { method: "PATCH" }),
};
