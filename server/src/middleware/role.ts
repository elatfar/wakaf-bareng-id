import { createMiddleware } from "hono/factory";
import type { Role } from "shared";

export function requireRole(roles: Role[]) {
  return createMiddleware(async (c, next) => {
    const pengguna = c.get("pengguna");
    if (!pengguna || !roles.includes(pengguna.role)) {
      return c.json({ success: false, message: "Akses ditolak" }, 403);
    }
    await next();
  });
}
