import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { parseBody } from "next-sanity/webhook";
import { checkRateLimit, getClientIP } from "@/lib/rate-limit";
import { rutasARevalidar } from "@/lib/revalidacion";

// Webhook de Sanity (sanity.io/manage → API → Webhooks): al publicar un
// documento, regenera las páginas que lo muestran sin esperar al revalidate
// de respaldo (300 s). La firma se valida con SANITY_REVALIDATE_SECRET, el
// mismo secreto cargado en el webhook. Proyección del webhook:
// {_type, "slug": slug.current}.

type CuerpoWebhook = { _type?: unknown; slug?: unknown };

export async function POST(req: NextRequest) {
  const { allowed } = checkRateLimit(`revalidate:${getClientIP(req)}`);
  if (!allowed) return NextResponse.json({ error: "Demasiadas solicitudes" }, { status: 429 });

  const secret = process.env.SANITY_REVALIDATE_SECRET;
  if (!secret) {
    console.error("[revalidate] Falta SANITY_REVALIDATE_SECRET: no se puede validar el webhook.");
    return NextResponse.json({ error: "Revalidación no configurada" }, { status: 500 });
  }

  let parsed: Awaited<ReturnType<typeof parseBody<CuerpoWebhook>>>;
  try {
    parsed = await parseBody<CuerpoWebhook>(req, secret);
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });
  }
  if (!parsed.isValidSignature) {
    return NextResponse.json({ error: "Firma inválida" }, { status: 401 });
  }
  const tipo = parsed.body?._type;
  if (typeof tipo !== "string" || !tipo) {
    return NextResponse.json({ error: "Falta _type" }, { status: 400 });
  }

  const rutas = rutasARevalidar(tipo);
  for (const r of rutas) revalidatePath(r.path, r.type);
  console.info(`[revalidate] ${tipo}: ${rutas.length ? rutas.map((r) => r.path).join(", ") : "sin páginas que lo usen"}`);
  return NextResponse.json({ revalidated: rutas.length > 0, tipo, rutas: rutas.map((r) => r.path) });
}
