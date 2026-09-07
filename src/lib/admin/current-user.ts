import { headers } from "next/headers";
import type { AdminRole } from "@/lib/admin/auth-users";

export type AdminSession = { user: string; rol: AdminRole };

/** Lee el usuario/rol seteado por src/proxy.ts tras validar Basic Auth. */
export async function getAdminUser(): Promise<AdminSession | null> {
  const h = await headers();
  const user = h.get("x-admin-user");
  const rol = h.get("x-admin-rol") as AdminRole | null;
  if (!user || !rol) return null;
  return { user, rol };
}
