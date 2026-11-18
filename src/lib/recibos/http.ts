import type { NextRequest } from "next/server";
import { URL_PUBLICA } from "./constantes";
import { ipCliente } from "@/lib/seguridad/ip";

/** Base de los links que van por email: en producción siempre el dominio
 * público; en dev/tests, el host que atendió el request (así el e2e abre el
 * link contra el servidor local). */
export function baseUrlLinks(req: NextRequest): string {
  return process.env.NODE_ENV === "production" ? URL_PUBLICA : req.nextUrl.origin;
}

/** IP y dispositivo, siempre desde los headers del request (en Vercel,
 * x-real-ip y x-forwarded-for los completa la plataforma) — nunca del body.
 * Sin esos headers no se inventa una IP: queda null. */
export function evidenciaRequest(req: NextRequest): { ip: string | null; userAgent: string | null } {
  const conIP = req.headers.has("x-real-ip") || req.headers.has("x-forwarded-for");
  const ua = req.headers.get("user-agent");
  return {
    ip: conIP ? ipCliente(req) : null,
    userAgent: ua ? ua.slice(0, 500) : null,
  };
}

export function respuestaPdf(pdf: Buffer, nombre: string, disposition: "attachment" | "inline" = "attachment") {
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${disposition}; filename="${nombre.replace(/[^\w .-]/g, "_")}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
