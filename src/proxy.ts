import { NextRequest, NextResponse } from "next/server";
import { parseAdminUsers, isAllowedForRole } from "@/lib/admin/auth-users";

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};

export function proxy(req: NextRequest) {
  const users = parseAdminUsers();

  if (users.length === 0) {
    console.error("[admin] Ningún usuario configurado (ADMIN_USERS o ADMIN_USER/ADMIN_PASSWORD)");
    return new NextResponse("Panel de administración no configurado", { status: 503 });
  }

  const authHeader = req.headers.get("authorization");
  let matched = null as (typeof users)[number] | null;

  if (authHeader?.startsWith("Basic ")) {
    const decoded = Buffer.from(authHeader.slice(6), "base64").toString("utf-8");
    const separatorIndex = decoded.indexOf(":");
    const suppliedUser = decoded.slice(0, separatorIndex);
    const suppliedPassword = decoded.slice(separatorIndex + 1);
    matched = users.find((u) => u.user === suppliedUser && u.pass === suppliedPassword) ?? null;
  }

  if (!matched) {
    return new NextResponse("Autenticación requerida", {
      status: 401,
      headers: { "WWW-Authenticate": 'Basic realm="MOVARA Admin"' },
    });
  }

  const pathname = req.nextUrl.pathname;
  if (!isAllowedForRole(matched.rol, pathname)) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "No tenés permiso para esta sección" }, { status: 403 });
    }
    return NextResponse.redirect(new URL("/admin", req.url));
  }

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-admin-user", matched.user);
  requestHeaders.set("x-admin-rol", matched.rol);
  return NextResponse.next({ request: { headers: requestHeaders } });
}
