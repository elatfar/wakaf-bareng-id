import { createMiddleware } from "hono/factory";
import { jwtVerify } from "jose";
import type { Role } from "shared";

export interface JwtPayload {
  id: number;
  email: string;
  role: Role;
}

declare module "hono" {
  interface ContextVariableMap {
    pengguna: JwtPayload;
  }
}

// JWT Secret configuration
// For local development: uses process.env.JWT_SECRET
// For Cloudflare Workers: would use c.env.JWT_SECRET binding
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "wakaf-bareng-jwt-secret-2026"
);

export const authMiddleware = createMiddleware(async (c, next) => {
  const authHeader = c.req.header("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return c.json({ success: false, message: "Token tidak valid atau sudah kedaluwarsa" }, 401);
  }

  const token = authHeader.slice(7);
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    c.set("pengguna", payload as unknown as JwtPayload);
    await next();
  } catch {
    return c.json({ success: false, message: "Token tidak valid atau sudah kedaluwarsa" }, 401);
  }
});

export async function signToken(payload: JwtPayload): Promise<string> {
  const { SignJWT } = await import("jose");
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("8h")
    .sign(JWT_SECRET);
}
