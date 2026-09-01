import { sql, relations } from "drizzle-orm";
import {
  pgTable,
  serial,
  text,
  boolean,
  numeric,
  integer,
  timestamp,
  date,
  jsonb,
  pgEnum,
} from "drizzle-orm/pg-core";
import type { LayoutField } from "shared";

// === Enums ===
export const roleEnum = pgEnum("role", ["superadmin", "admin", "kasir"]);
export const jenisWakafEnum = pgEnum("jenis_wakaf", ["uang", "barang"]);
export const statusTransaksiEnum = pgEnum("status_transaksi", [
  "pending",
  "terverifikasi",
  "batal",
]);
export const statusSertifikatEnum = pgEnum("status_sertifikat", [
  "draft",
  "terbit",
  "dicetak",
  "dikirim",
]);
export const tipeEnum = pgEnum("tipe", ["wakaf", "zakat"]);

// === Tables ===
export const donatur = pgTable("donatur", {
  id: serial("id").primaryKey(),
  nama: text("nama").notNull(),
  noHp: text("no_hp"),
  email: text("email"),
  alamat: text("alamat"),
  nik: text("nik"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const program = pgTable("program", {
  id: serial("id").primaryKey(),
  namaProgram: text("nama_program").notNull(),
  tipe: tipeEnum("tipe").notNull().default("wakaf"),
  deskripsi: text("deskripsi"),
  targetDana: numeric("target_dana", { precision: 15, scale: 2 }),
  aktif: boolean("aktif").notNull().default(true),
  tanggalMulai: date("tanggal_mulai"),
  tanggalSelesai: date("tanggal_selesai"),
  kategori: text("kategori"),
  prioritas: integer("prioritas").default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const pengguna = pgTable("pengguna", {
  id: serial("id").primaryKey(),
  nama: text("nama").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: roleEnum("role").notNull().default("admin"),
});

export const penandatangan = pgTable("penandatangan", {
  id: serial("id").primaryKey(),
  nama: text("nama").notNull(),
  jabatan: text("jabatan").notNull(),
  fileTtd: text("file_ttd"),
  aktif: boolean("aktif").notNull().default(true),
});

export const templateSertifikat = pgTable("template_sertifikat", {
  id: serial("id").primaryKey(),
  namaTemplate: text("nama_template").notNull(),
  tipe: tipeEnum("tipe").notNull().default("wakaf"),
  fileBackground: text("file_background").notNull(),
  layoutField: jsonb("layout_field").notNull().$type<LayoutField>(),
  penandatangan1Id: integer("penandatangan_1_id").references(
    () => penandatangan.id
  ),
  penandatangan2Id: integer("penandatangan_2_id").references(
    () => penandatangan.id
  ),
  aktif: boolean("aktif").notNull().default(false),
});

export const transaksi = pgTable("transaksi", {
  id: serial("id").primaryKey(),
  noTransaksi: text("no_transaksi").notNull().unique(),
  donaturId: integer("donatur_id")
    .notNull()
    .references(() => donatur.id),
  programId: integer("program_id")
    .notNull()
    .references(() => program.id),
  jenis: jenisWakafEnum("jenis").notNull(),
  tipe: tipeEnum("tipe").notNull().default("wakaf"),
  deskripsiBarang: text("deskripsi_barang"),
  jumlah: numeric("jumlah", { precision: 15, scale: 2 }).notNull(),
  jumlahTerbilang: text("jumlah_terbilang").notNull(),
  metodePembayaran: text("metode_pembayaran"),
  tanggal: text("tanggal").notNull(),
  status: statusTransaksiEnum("status").notNull().default("terverifikasi"),
  dicatatOleh: integer("dicatat_oleh").references(() => pengguna.id),
  catatan: text("catatan"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const sertifikat = pgTable("sertifikat", {
  id: serial("id").primaryKey(),
  transaksiId: integer("transaksi_id")
    .notNull()
    .unique()
    .references(() => transaksi.id),
  templateId: integer("template_id")
    .notNull()
    .references(() => templateSertifikat.id),
  noSertifikat: text("no_sertifikat").notNull().unique(),
  tanggalTerbit: text("tanggal_terbit").notNull(),
  filePath: text("file_path"),
  status: statusSertifikatEnum("status").notNull().default("terbit"),
  dikirimVia: text("dikirim_via"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// === Relations ===

export const templateSertifikatRelations = relations(templateSertifikat, ({ one }) => ({
  penandatangan1: one(penandatangan, {
    fields: [templateSertifikat.penandatangan1Id],
    references: [penandatangan.id],
    relationName: "penandatangan1",
  }),
  penandatangan2: one(penandatangan, {
    fields: [templateSertifikat.penandatangan2Id],
    references: [penandatangan.id],
    relationName: "penandatangan2",
  }),
}));

export const penandatanganRelations = relations(penandatangan, ({ many }) => ({
  templateSebagaiPenandatangan1: many(templateSertifikat, { relationName: "penandatangan1" }),
  templateSebagaiPenandatangan2: many(templateSertifikat, { relationName: "penandatangan2" }),
}));

export const donaturRelations = relations(donatur, ({ many }) => ({
  transaksi: many(transaksi),
}));

export const programRelations = relations(program, ({ many }) => ({
  transaksi: many(transaksi),
}));

export const penggunaRelations = relations(pengguna, ({ many }) => ({
  transaksiDicatat: many(transaksi),
}));

export const transaksiRelations = relations(transaksi, ({ one }) => ({
  donatur: one(donatur, {
    fields: [transaksi.donaturId],
    references: [donatur.id],
  }),
  program: one(program, {
    fields: [transaksi.programId],
    references: [program.id],
  }),
  dicatatOleh: one(pengguna, {
    fields: [transaksi.dicatatOleh],
    references: [pengguna.id],
  }),
  sertifikat: one(sertifikat),
}));

export const sertifikatRelations = relations(sertifikat, ({ one }) => ({
  transaksi: one(transaksi, {
    fields: [sertifikat.transaksiId],
    references: [transaksi.id],
  }),
  template: one(templateSertifikat, {
    fields: [sertifikat.templateId],
    references: [templateSertifikat.id],
  }),
}));
