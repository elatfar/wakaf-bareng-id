import type {
  ApiResponse,
  Donatur, BuatDonaturInput,
  Program, BuatProgramInput,
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
  list: () => request<Donatur[]>("/donatur"),
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
  list: (aktif?: boolean) =>
    request<Program[]>(`/program${aktif ? "?aktif=true" : ""}`),
  create: (body: BuatProgramInput) =>
    request<Program>("/program", { method: "POST", body: JSON.stringify(body) }),
  update: (id: number, body: Partial<BuatProgramInput>) =>
    request<Program>(`/program/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  setAktif: (id: number, aktif: boolean) =>
    request<Program>(`/program/${id}`, { method: "PATCH", body: JSON.stringify({ aktif }) }),
};

// ─── Pengguna ────────────────────────────────────────────────────────────────
export const penggunaApi = {
  list: () => request<Pengguna[]>("/pengguna"),
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
  list: () => request<TransaksiDetail[]>("/transaksi"),
  get: (id: number) => request<TransaksiDetail>(`/transaksi/${id}`),
  create: (body: BuatTransaksiInput) =>
    request<TransaksiDetail>("/transaksi", { method: "POST", body: JSON.stringify(body) }),
  updateStatus: (id: number, status: string) =>
    request<TransaksiDetail>(`/transaksi/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
};

// ─── Sertifikat ───────────────────────────────────────────────────────────────
export const sertifikatApi = {
  list: () => request<SertifikatDetail[]>("/sertifikat"),
  get: (id: number) => request<SertifikatDetail>(`/sertifikat/${id}`),
  generate: (transaksiId: number) =>
    request<Sertifikat>(`/sertifikat/generate/${transaksiId}`, { method: "POST" }),
  updateStatus: (id: number, status: string, dikirimVia?: string) =>
    request<Sertifikat>(`/sertifikat/${id}/status`, { method: "PATCH", body: JSON.stringify({ status, dikirimVia }) }),
  downloadUrl: (id: number) => {
    // For downloads, we use the endpoint without /api prefix for direct browser/WhatsApp access
    // This endpoint is available at /sertifikat/:id/download (not /api/sertifikat/:id/download)
    const baseUrl = import.meta.env.DEV 
      ? ((import.meta.env.VITE_SERVER_URL as string) || "http://localhost:3000")
      : "";
    return `${baseUrl}/sertifikat/${id}/download`;
  },
};

// ─── Template ─────────────────────────────────────────────────────────────────
export const templateApi = {
  list: () => request<TemplateSertifikatDetail[]>("/template"),
  get: (id: number) => request<TemplateSertifikatDetail>(`/template/${id}`),
  create: (body: BuatTemplateInput) =>
    request<TemplateSertifikatDetail>("/template", { method: "POST", body: JSON.stringify(body) }),
  setAktif: (id: number) =>
    request<TemplateSertifikatDetail>(`/template/${id}/aktif`, { method: "PATCH" }),
};
