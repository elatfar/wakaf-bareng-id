import { sql } from "drizzle-orm";
import type { DrizzleDb } from "../db/client";
import { transaksi, sertifikat } from "../db/schema";

export type NomorPrefix =
  | "TRX"
  | "CERT"
  | "TRX-WKF"
  | "TRX-ZKT"
  | "CERT-WKF"
  | "CERT-ZKT"
  | string;

/**
 * Pure helper — build formatted number string. Testable without DB.
 * Format: PREFIX/YYYY/MM/NNNNN (5-digit zero-padded sequence)
 * e.g. CERT-WKF/2026/09/00001 or CERT-ZKT/2026/09/00001
 */
export function buildNomorString(
  prefix: NomorPrefix,
  year: number,
  month: number,
  seq: number
): string {
  if (seq > 99999) throw new RangeError("Sequence exceeds 5-digit limit (99999)");
  const yy = String(year);
  const mm = String(month).padStart(2, "0");
  const nn = String(seq).padStart(5, "0");
  return `${prefix}/${yy}/${mm}/${nn}`;
}

/**
 * Concurrency-safe sequential number generator using PostgreSQL advisory lock.
 * Uses pg_advisory_xact_lock within a transaction to prevent duplicate numbers
 * when concurrent requests arrive in the same prefix+month window.
 */
export async function generateNomor(
  prefix: NomorPrefix,
  db: DrizzleDb
): Promise<string> {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const yearStr = String(year);
  const monthStr = String(month).padStart(2, "0");
  const pattern = `${prefix}/${yearStr}/${monthStr}/%`;

  return await db.transaction(async (tx) => {
    // Acquire a transaction-scoped advisory lock keyed on prefix+month.
    // The lock is automatically released when the transaction ends.
    const lockKey = `${prefix}_${yearStr}_${monthStr}`;
    await tx.execute(
      sql`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`
    );

    // Count existing records for this prefix/month to derive next sequence number.
    let count = 0;
    if (prefix.startsWith("TRX")) {
      const result = await tx
        .select({ count: sql<number>`COUNT(*)::int` })
        .from(transaksi)
        .where(sql`${transaksi.noTransaksi} LIKE ${pattern}`);
      count = result[0]?.count ?? 0;
    } else {
      const result = await tx
        .select({ count: sql<number>`COUNT(*)::int` })
        .from(sertifikat)
        .where(sql`${sertifikat.noSertifikat} LIKE ${pattern}`);
      count = result[0]?.count ?? 0;
    }

    const seq = count + 1;
    return buildNomorString(prefix, year, month, seq);
  });
}
