import type { Penandatangan } from "./penandatangan";

export interface LayoutFieldItem {
  x: number;
  y: number;
  size: number;
  align: "left" | "center" | "right";
  bold: boolean;
}

export interface LayoutField {
  namaDonatur: LayoutFieldItem;
  deskripsiWakaf: LayoutFieldItem;
  jumlahTerbilang: LayoutFieldItem;
  noSertifikat: LayoutFieldItem;
  tanggalTerbit: LayoutFieldItem;
  canvasWidth: number;
  canvasHeight: number;
}

export interface TemplateSertifikat {
  id: number;
  namaTemplate: string;
  fileBackground: string;
  layoutField: LayoutField;
  penandatangan1Id: number | null;
  penandatangan2Id: number | null;
  aktif: boolean;
}

export interface TemplateSertifikatDetail extends TemplateSertifikat {
  penandatangan1: Penandatangan | null;
  penandatangan2: Penandatangan | null;
}

export interface BuatTemplateInput {
  namaTemplate: string;
  fileBackground: string;
  layoutField: LayoutField;
  penandatangan1Id?: number;
  penandatangan2Id?: number;
}
