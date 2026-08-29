import { Hono } from "hono";
import { compare } from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "../db/client";
import { pengguna } from "../db/schema";
import { signToken } from "../middleware/auth";
import type { ApiResponse, LoginResponse } from "shared";

const app = new Hono();

app.post("/login", async (c) => {
  const body = await c.req.json<{ email?: string; password?: string }>();

  if (!body.email || !body.password) {
    return c.json<ApiResponse>({
      success: false,
      message: "Email dan password wajib diisi",
    }, 400);
  }

  const user = await db.query.pengguna.findFirst({
    where: eq(pengguna.email, body.email),
  });

  if (!user) {
    return c.json<ApiResponse>({
      success: false,
      message: "Email atau kata sandi salah",
    }, 401);
  }

  const valid = await compare(body.password, user.passwordHash);
  if (!valid) {
    return c.json<ApiResponse>({
      success: false,
      message: "Email atau kata sandi salah",
    }, 401);
  }

  const token = await signToken({ id: user.id, email: user.email, role: user.role });

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
