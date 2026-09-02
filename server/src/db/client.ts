import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";

type DrizzleInstance = ReturnType<typeof drizzle<typeof schema>>;
export type DrizzleDb = DrizzleInstance;

// Track the connection URL used for the current singleton.
// If the URL changes (or if a new URL is provided), recreate the connection.
let _db: DrizzleInstance | null = null;
let _url: string | null = null;

/**
 * Returns a Drizzle DB instance using Neon Serverless HTTP driver.
 * - If `connectionString` is provided and differs from the current one, creates a new instance.
 * - Falls back to process.env.DATABASE_URL for local Bun dev.
 */
export function getDb(connectionString?: string): DrizzleInstance {
  const url = connectionString ?? (typeof process !== "undefined" ? process.env?.DATABASE_URL : undefined) ?? _url;
  if (!url) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  // Recreate if URL changed (handles Workers isolate with different env)
  if (_db && _url === url) return _db;

  const sql = neon(url);
  _db = drizzle(sql, { schema });
  _url = url;
  return _db;
}
