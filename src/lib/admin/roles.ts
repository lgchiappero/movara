export const adminRoles = ["admin", "vendedor"] as const;
export type AdminRole = (typeof adminRoles)[number];

/** Rutas (páginas o API) fuera del alcance del rol "vendedor" — todo lo
 * demás bajo /admin queda permitido (dashboard, leads, pedidos). */
const ADMIN_ONLY_PREFIXES = [
  "/admin/usuarios",
  "/admin/contenido",
  "/admin/modelos",
  "/admin/configuracion",
];
const ADMIN_ONLY_API_PREFIXES = [
  "/api/admin/usuarios",
];

/** True si `pathname` es exactamente `prefix` o un subpath de `prefix`.
 * Un `startsWith` simple confundiría "/admin/configuracion" con
 * "/admin/configuraciones" (pedidos) — comparten prefijo de caracteres
 * pero son rutas completamente distintas. */
function matchesPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function isAllowedForRole(rol: AdminRole, pathname: string): boolean {
  if (rol === "admin") return true;
  const restricted = [...ADMIN_ONLY_PREFIXES, ...ADMIN_ONLY_API_PREFIXES];
  return !restricted.some((prefix) => matchesPrefix(pathname, prefix));
}
