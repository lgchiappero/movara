import type { NextRequest } from "next/server";
import { URL_PUBLICA } from "./constantes";
import { getClientIP } from "@/lib/rate-limit";

/** Base de los links que van por email: en producción siempre el dominio
 * público; en dev/tests, el host que atendió el request (así el e2e abre el
 * link contra el servidor local). */
export function baseUrlLinks(req: NextRequest): string {
  return process.env.NODE_ENV === "production" ? URL_PUBLICA : req.nextUrl.origin;
}

/** IP y dispositivo, siempre desde los headers del request (en Vercel,
 * x-forwarded-for lo completa la plataforma) — nunca del body. */
export function evidenciaRequest(req: NextRequest): { ip: string | null; userAgent: string | null } {
  const forwarded = req.headers.get("x-forwarded-for");
  const ua = req.headers.get("user-agent");
  return {
    ip: forwarded ? getClientIP(req) : null,
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
