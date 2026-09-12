import { Hono } from "hono";
import { compare } from "bcryptjs";
import { eq } from "drizzle-orm";
import { getDb } from "../db/client";
import { pengguna } from "../db/schema";
import { signToken } from "../middleware/auth";
import type { ApiResponse, LoginResponse } from "shared";

const app = new Hono();

// Wall-clock timings (not CPU time); never log credentials or tokens.
app.use("/login", async (c, next) => {
  c.header("Cache-Control", "no-store");
  await next();
});

app.post("/login", async (c) => {
  const body = await c.req.json<{ email?: string; password?: string }>();

  if (!body.email || !body.password) {
    return c.json<ApiResponse>({
      success: false,
      message: "Email dan password wajib diisi",
    }, 400);
  }

  const db = getDb();
  const timings: string[] = [];
  let started = performance.now();
  const mark = (name: string) => {
    const now = performance.now();
    timings.push(`${name};dur=${(now - started).toFixed(1)}`);
    c.header("Server-Timing", timings.join(", "));
    started = now;
  };
  const user = await db.query.pengguna.findFirst({
    columns: { id: true, nama: true, email: true, role: true, passwordHash: true },
    where: eq(pengguna.email, body.email),
  });
  mark("db");

  if (!user) {
    return c.json<ApiResponse>({
      success: false,
      message: "Email atau kata sandi salah",
    }, 401);
  }

  const valid = await compare(body.password, user.passwordHash);
  mark("password");
  if (!valid) {
    return c.json<ApiResponse>({
      success: false,
      message: "Email atau kata sandi salah",
    }, 401);
  }

  const token = await signToken(
    { id: user.id, email: user.email, role: user.role },
    (c.env as Record<string, string>)?.JWT_SECRET
  );
  mark("token");

  return c.json<ApiResponse<LoginResponse>>({
    success: true,
    message: "Login berhasil",
    data: {
      token,
      pengguna: {
        id: user.id,
        nama: user.nama,
        email: user.email,
        role: user.role,
      },
    },
  });
});

export default app;
