---
inclusion: always
---

# Database

Project menggunakan Neon PostgreSQL (bukan SQLite) untuk semua environment.

Connection string: `postgresql://neondb_owner:npg_zFUVIxp37SdR@ep-winter-haze-b3rw8hih-pooler.c-4.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require`

Gunakan driver `postgres-js` dan Drizzle ORM dengan `drizzle-orm/pg-core` (`pgTable`).
Simpan connection string di `server/.env` sebagai `DATABASE_URL`.
