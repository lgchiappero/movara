import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifySessionToken, SESSION_COOKIE_NAME } from "@/lib/admin/session";
import { isAllowedForRole, type AdminRole } from "@/lib/admin/roles";

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};

// Rutas que no requieren sesión — son la puerta de entrada (login) o están
// protegidas por su propio mecanismo (bootstrap usa un secreto de header).
const PUBLIC_PATHS = ["/admin/login", "/api/admin/auth/login", "/api/admin/auth/logout", "/api/admin/bootstrap"];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function unauthorized(req: NextRequest, pathname: string) {
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Sesión inválida o expirada" }, { status: 401 });
  }
  return NextResponse.redirect(new URL("/admin/login", req.url));
}

export async function proxy(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  const payload = token ? await verifySessionToken(token) : null;
  if (!payload) {
    return unauthorized(req, pathname);
  }

  // El rol y el estado "activo" se leen en vivo de la base en cada request
  // (no viajan en el JWT) — así desactivar un usuario o cambiarle el rol
  // aplica de inmediato, no cuando expire el token.
  const user = await db.adminUser.findUnique({ where: { id: payload.sub } });
  if (!user || !user.activo) {
    return unauthorized(req, pathname);
  }

  const rol = user.rol as AdminRole;
  if (!isAllowedForRole(rol, pathname)) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "No tenés permiso para esta sección" }, { status: 403 });
    }
    return NextResponse.redirect(new URL("/admin", req.url));
  }

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-admin-id", user.id);
  requestHeaders.set("x-admin-nombre", user.nombre);
  requestHeaders.set("x-admin-email", user.email);
  requestHeaders.set("x-admin-rol", rol);
  return NextResponse.next({ request: { headers: requestHeaders } });
}
