import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

type DrizzleInstance = ReturnType<typeof drizzle<typeof schema>>;
export type DrizzleDb = DrizzleInstance;

// Track the connection URL used for the current singleton.
// If the URL changes (or if a new URL is provided), recreate the connection.
let _db: DrizzleInstance | null = null;
let _url: string | null = null;

/**
 * Returns a Drizzle DB instance.
 * - If `connectionString` is provided and differs from the current one, creates a new instance.
 * - Falls back to process.env.DATABASE_URL for local Bun dev.
 */
export function getDb(connectionString?: string): DrizzleInstance {
  const url = connectionString ?? process.env.DATABASE_URL ?? null;
  if (!url) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  // Recreate if URL changed (handles Workers isolate with different env)
  if (_db && _url === url) return _db;

  const sql = postgres(url, {
    max: 5,
    // Workers-compatible: disable prepared statements which can cause issues
    prepare: false,
    // Shorter idle timeout for serverless
    idle_timeout: 20,
    connect_timeout: 10,
  });

  _db = drizzle(sql, { schema });
  _url = url;
  return _db;
}
