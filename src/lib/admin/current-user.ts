import { headers } from "next/headers";
import type { AdminRole } from "@/lib/admin/roles";

export type AdminSession = { id: string; nombre: string; email: string; rol: AdminRole };

/** Lee el usuario/rol seteado por src/proxy.ts tras verificar la sesión JWT
 * contra el estado en vivo del usuario en la base. */
export async function getAdminUser(): Promise<AdminSession | null> {
  const h = await headers();
  const id = h.get("x-admin-id");
  const nombre = h.get("x-admin-nombre");
  const email = h.get("x-admin-email");
  const rol = h.get("x-admin-rol") as AdminRole | null;
  if (!id || !nombre || !email || !rol) return null;
  return { id, nombre, email, rol };
}
