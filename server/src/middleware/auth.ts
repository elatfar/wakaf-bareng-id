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

const FALLBACK_JWT_SECRET = "wakaf-bareng-jwt-secret-2026";

function getJwtSecret(envSecret?: string): Uint8Array {
  return new TextEncoder().encode(
    envSecret ?? process.env.JWT_SECRET ?? FALLBACK_JWT_SECRET
  );
}

export const authMiddleware = createMiddleware(async (c, next) => {
  const authHeader = c.req.header("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return c.json({ success: false, message: "Token tidak valid atau sudah kedaluwarsa" }, 401);
  }

  const token = authHeader.slice(7);
  // Read JWT_SECRET from Cloudflare env bindings (c.env) at request time
  const jwtSecret = getJwtSecret((c.env as Record<string, string>)?.JWT_SECRET);
  try {
    const { payload } = await jwtVerify(token, jwtSecret);
    c.set("pengguna", payload as unknown as JwtPayload);
    await next();
  } catch {
    return c.json({ success: false, message: "Token tidak valid atau sudah kedaluwarsa" }, 401);
  }
});

export async function signToken(payload: JwtPayload, envSecret?: string): Promise<string> {
  const { SignJWT } = await import("jose");
  const jwtSecret = getJwtSecret(envSecret);
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("8h")
    .sign(jwtSecret);
}
