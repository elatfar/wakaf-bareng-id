import type { TransaksiDetail } from "./transaksi";

export interface Sertifikat {
  id: number;
  transaksiId: number;
  templateId: number;
  noSertifikat: string;
  tanggalTerbit: string;
  filePath: string | null;
  status: "draft" | "terbit" | "dicetak" | "dikirim";
  dikirimVia: string | null;
  createdAt: string;
}

export interface SertifikatDetail extends Sertifikat {
  transaksi: TransaksiDetail;
}
