import { NextResponse } from "next/server";
import { claveIP, consumirRateLimit } from "@/lib/rate-limit-db";
import { resumenError } from "@/lib/log-seguro";
import { ipCliente } from "./ip";
import { CAMPO_TRAMPA } from "./campo-trampa";

/** Protección de los endpoints públicos (sin sesión): rate limit compartido
 * por IP (tabla rate_limit_hits, ver src/lib/rate-limit-db.ts), límite de
 * tamaño del body y campo trampa (honeypot) para bots. Los límites de cada
 * endpoint están en LIMITES, en un solo lugar. Ver docs/base-del-sitio.md. */

const MINUTO = 60_000;
const HORA = 60 * MINUTO;

export type Limite = { max: number; ventanaMs: number };

export const LIMITES = {
  leadsEmail: { max: 5, ventanaMs: HORA },
  pedido: { max: 10, ventanaMs: HORA },
  citas: { max: 10, ventanaMs: HORA },
  cancelarCitaIP: { max: 10, ventanaMs: HORA },
  cancelarCitaId: { max: 5, ventanaMs: HORA },
  miPedido: { max: 30, ventanaMs: HORA },
  reciboPdf: { max: 30, ventanaMs: HORA },
  revalidate: { max: 120, ventanaMs: MINUTO },
  bootstrap: { max: 5, ventanaMs: HORA },
  // Webhook de WhatsApp: Meta manda desde pocas IPs (red de contención) y
  // cada número tiene su propio cupo (más allá se guarda pero no se responde).
  whatsappIP: { max: 600, ventanaMs: MINUTO },
  whatsappNumero: { max: 30, ventanaMs: 10 * MINUTO },
  whatsappAvisoNumero: { max: 1, ventanaMs: 10 * MINUTO },
} satisfies Record<string, Limite>;

/** Tamaño máximo del body (bytes) de cada formulario público. */
export const MAX_BODY = {
  leadsEmail: 4 * 1024,
  leads: 8 * 1024,
  citas: 16 * 1024,
  pedido: 64 * 1024,
  whatsapp: 64 * 1024,
  chico: 2 * 1024, // mi-pedido, cancelar cita, confirmar recibo, login
} as const;

/** Campo trampa: invisible para las personas (CampoTrampa), los bots que
 * completan todo lo llenan. Ningún esquema de Zod lo declara: si viene
 * vacío, se descarta solo. */
export { CAMPO_TRAMPA };

export const RESPUESTA_429 = "Recibimos muchos envíos desde tu conexión. Probá en un rato o escribinos por WhatsApp.";

/** Consume un cupo del rate limit de `scope` para la IP del pedido. Si la
 * tabla no responde se deja pasar (con log): una caída de la base no tiene
 * que cortar los formularios por esto (los demás pasos fallan solos). */
export async function permitirIP(req: Request, scope: string, limite: Limite): Promise<boolean> {
  return permitirClave(claveIP(scope, ipCliente(req)), scope, limite);
}

/** Solo e2e: Playwright levanta `next dev` con E2E_LIMITES_ALTOS=1 porque
 * los specs crean decenas de pedidos y consultas desde la misma IP. Nunca
 * aplica en producción (en Vercel NODE_ENV es "production", también en los
 * previews). El bloqueo del login no usa esto: se prueba con sus límites. */
export function factorLimitesE2E(): number {
  return process.env.E2E_LIMITES_ALTOS === "1" && process.env.NODE_ENV !== "production" ? 100 : 1;
}

/** Igual que permitirIP, con una clave armada por quien llama (ej. por id). */
export async function permitirClave(clave: string, scope: string, limite: Limite): Promise<boolean> {
  return consumirRateLimit(clave, limite.max * factorLimitesE2E(), limite.ventanaMs).catch((err) => {
    console.error(`[seguridad] Rate limit "${scope}" no disponible — se permite: ${resumenError(err)}`);
    return true;
  });
}

export function demasiadosPedidos(mensaje = RESPUESTA_429): NextResponse {
  return NextResponse.json({ error: mensaje }, { status: 429 });
}

export type LecturaJson = { ok: true; datos: unknown } | { ok: false; respuesta: NextResponse };
export type LecturaTexto = { ok: true; texto: string } | { ok: false; respuesta: NextResponse };

/** Lee el body como texto crudo sin pasar de `maxBytes`: rechaza con 413 por
 * el Content-Length declarado y, si no viene o miente, corta la lectura
 * apenas se pasa. Para verificar firmas (se calculan sobre el body tal cual). */
export async function leerTextoLimitado(req: Request, maxBytes: number): Promise<LecturaTexto> {
  const muyGrande = () => ({ ok: false as const, respuesta: NextResponse.json({ error: "El envío es demasiado grande." }, { status: 413 }) });

  const declarado = Number(req.headers.get("content-length"));
  if (Number.isFinite(declarado) && declarado > maxBytes) return muyGrande();
  if (!req.body) return { ok: true, texto: "" };

  const lector = req.body.getReader();
  const partes: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await lector.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await lector.cancel();
      return muyGrande();
    }
    partes.push(value);
  }
  return { ok: true, texto: new TextDecoder().decode(Buffer.concat(partes)) };
}

/** Lee el body como JSON sin pasar de `maxBytes` (ver leerTextoLimitado). Un
 * JSON mal formado da `datos: null` (que lo rechace el esquema de la ruta,
 * con su mensaje de siempre). */
export async function leerJsonLimitado(req: Request, maxBytes: number): Promise<LecturaJson> {
  const lectura = await leerTextoLimitado(req, maxBytes);
  if (!lectura.ok) return lectura;
  if (!lectura.texto) return { ok: true, datos: null };
  try {
    return { ok: true, datos: JSON.parse(lectura.texto) };
  } catch {
    return { ok: true, datos: null };
  }
}

/** ¿El envío trae el campo trampa completo? Entonces es un bot: la ruta
 * responde como si hubiera salido bien, sin guardar ni mandar nada, para
 * que no se entere y no pruebe otra cosa. */
export function esTrampa(datos: unknown): boolean {
  if (!datos || typeof datos !== "object") return false;
  const valor = (datos as Record<string, unknown>)[CAMPO_TRAMPA];
  return typeof valor === "string" ? valor.trim() !== "" : valor != null;
}

/** Respuesta "exitosa" para un bot del honeypot. */
export function respuestaTrampa(cuerpo: Record<string, unknown> = { ok: true }): NextResponse {
  return NextResponse.json(cuerpo);
}
