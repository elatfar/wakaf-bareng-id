import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Database client — lazy singleton.
// The connection is established only on the first call to getDb(),
// which happens inside a request handler (not at module load time).
// This is required for Cloudflare Workers where secrets (DATABASE_URL)
// are only available at request time, not during module initialization.

type DrizzleInstance = ReturnType<typeof drizzle<typeof schema>>;
export type DrizzleDb = DrizzleInstance;

let _db: DrizzleInstance | null = null;

/**
 * Returns the shared Drizzle DB instance, creating it on first call.
 * @param connectionString - Optional DATABASE_URL override (from c.env in CF Workers).
 *   If omitted, falls back to process.env.DATABASE_URL (local dev).
 */
export function getDb(connectionString?: string): DrizzleInstance {
  if (_db) return _db;
  const url = connectionString ?? process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL environment variable is not set");
  }
  const sql = postgres(url, { max: 5 });
  _db = drizzle(sql, { schema });
  return _db;
}
