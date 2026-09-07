import { z } from "zod";

export const adminRoles = ["admin", "editor"] as const;
export type AdminRole = (typeof adminRoles)[number];

export type AdminUser = { user: string; pass: string; rol: AdminRole };

const AdminUsersSchema = z.array(
  z.object({
    user: z.string().min(1),
    pass: z.string().min(1),
    rol: z.enum(adminRoles),
  })
);

/**
 * Lee ADMIN_USERS (JSON) del entorno. Si no está seteada o es inválida, cae
 * a un único usuario admin con ADMIN_USER/ADMIN_PASSWORD — retrocompatible
 * con lo que ya está configurado en producción.
 */
export function parseAdminUsers(
  env: Record<string, string | undefined> = process.env
): AdminUser[] {
  const raw = env.ADMIN_USERS;
  if (raw) {
    try {
      const parsed = AdminUsersSchema.safeParse(JSON.parse(raw));
      if (parsed.success && parsed.data.length > 0) return parsed.data;
      console.error("[admin] ADMIN_USERS inválida, usando fallback legacy");
    } catch {
      console.error("[admin] ADMIN_USERS no es JSON válido, usando fallback legacy");
    }
  }

  const legacyUser = env.ADMIN_USER;
  const legacyPass = env.ADMIN_PASSWORD;
  if (legacyUser && legacyPass) {
    return [{ user: legacyUser, pass: legacyPass, rol: "admin" }];
  }

  return [];
}

/** Rutas (páginas o API) fuera del alcance del rol "editor". */
const ADMIN_ONLY_PREFIXES = ["/admin/configuraciones", "/admin/configuracion"];
const ADMIN_ONLY_API_PREFIXES = ["/api/admin/configuraciones"];

export function isAllowedForRole(rol: AdminRole, pathname: string): boolean {
  if (rol === "admin") return true;
  const restricted = [...ADMIN_ONLY_PREFIXES, ...ADMIN_ONLY_API_PREFIXES];
  return !restricted.some((prefix) => pathname.startsWith(prefix));
}
