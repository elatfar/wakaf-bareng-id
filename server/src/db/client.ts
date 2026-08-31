import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Database client configuration
// This setup supports both local development (PostgreSQL) and Cloudflare Workers (with modifications)

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is not set");
}

// For local development with PostgreSQL
const sql = postgres(connectionString, { max: 10 });
export const db = drizzle(sql, { schema });
export type DrizzleDb = typeof db;

// For Cloudflare Workers, you would need to:
// 1. Replace this with D1 or other Cloudflare-compatible database
// 2. Update wrangler.jsonc with database bindings
// 3. Modify this file to use the Cloudflare environment bindings
// 
// Example for Cloudflare D1:
// import { drizzle } from "drizzle-orm/d1";
// export const db = drizzle(c.env.DB, { schema });
