import { after, NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { claveDe } from "@/lib/rate-limit-db";
import { resumenError } from "@/lib/log-seguro";
import { igualSeguro } from "@/lib/seguridad/igual-seguro";
import { LIMITES, MAX_BODY, demasiadosPedidos, leerTextoLimitado, permitirClave, permitirIP } from "@/lib/seguridad/publico";
import { firmaValida } from "@/lib/whatsapp-cloud/firma";
import { leerWebhook, type MensajeEntrante } from "@/lib/whatsapp-cloud/payload";
import { telefonoWhatsapp } from "@/lib/bot-whatsapp/telefono";
import { procesarMensajeEntrante } from "@/lib/bot-whatsapp/procesar";
import { enviarAviso, destinoAvisos } from "@/lib/bot-whatsapp/avisos";
import { obtenerConfigBot } from "@/lib/bot-whatsapp/config";

/** Webhook de WhatsApp Cloud API. Público (Meta no manda sesión): lo protege
 * la firma X-Hub-Signature-256 con el App Secret. Responde 200 enseguida y
 * procesa después con after() — en Vercel, waitUntil hasta maxDuration. */

export const maxDuration = 60;

/** Verificación de Meta al configurar el webhook. */
export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const token = process.env.WHATSAPP_VERIFY_TOKEN;
  const challenge = p.get("hub.challenge");
  if (token && p.get("hub.mode") === "subscribe" && igualSeguro(p.get("hub.verify_token") ?? "", token) && challenge) {
    return new NextResponse(challenge.slice(0, 200), { status: 200, headers: { "Content-Type": "text/plain" } });
  }
  return new NextResponse("Forbidden", { status: 403 });
}

/** Guarda el mensaje (idempotente por waMessageId). Devuelve el lead a
 * procesar, o null si ya estaba guardado (reintento de Meta). */
async function guardarEntrante(m: MensajeEntrante, ahora: Date): Promise<{ leadId: string; telefono: string } | null> {
  const telefono = telefonoWhatsapp(`+${m.telefono}`) ?? m.telefono;
  const yaEsta = await db.mensajeWhatsapp.findUnique({ where: { waMessageId: m.waMessageId }, select: { id: true } });
  if (yaEsta) return null;
  const lead = await db.leadWhatsapp.upsert({
    where: { telefono },
    create: { telefono, ultimoMensajeEn: ahora, ultimoEntranteEn: ahora },
    update: { ultimoMensajeEn: ahora, ultimoEntranteEn: ahora },
  });
  try {
    await db.mensajeWhatsapp.create({
      data: { leadId: lead.id, direccion: "ENTRANTE", autor: "CLIENTE", tipo: m.tipo, contenido: m.contenido, waMessageId: m.waMessageId, creadoEn: ahora },
    });
  } catch (err) {
    // Dos reintentos simultáneos del mismo mensaje: el índice único gana.
    if ((err as { code?: string })?.code === "P2002") return null;
    throw err;
  }
  return { leadId: lead.id, telefono };
}

export async function POST(req: NextRequest) {
  if (!(await permitirIP(req, "whatsapp-ip", LIMITES.whatsappIP))) return demasiadosPedidos();

  const lectura = await leerTextoLimitado(req, MAX_BODY.whatsapp);
  if (!lectura.ok) return lectura.respuesta;
  if (!firmaValida(lectura.texto, req.headers.get("x-hub-signature-256"), process.env.WHATSAPP_APP_SECRET)) {
    console.error("[whatsapp] Webhook con firma inválida: rechazado");
    return NextResponse.json({ error: "Firma inválida" }, { status: 401 });
  }

  let datos: unknown = null;
  try {
    datos = JSON.parse(lectura.texto);
  } catch {
    // Firmado pero no es JSON: se acepta para que Meta no reintente.
  }
  const { mensajes, estados } = leerWebhook(datos);

  try {
    for (const e of estados) {
      await db.mensajeWhatsapp.updateMany({ where: { waMessageId: e.waMessageId }, data: { estadoEntrega: e.estado } });
    }
    if (estados.length > 0) console.info(`[whatsapp] ${estados.length} estado(s) de entrega registrados`);

    // Último mensaje nuevo de cada lead: su invocación responde a todos.
    const aProcesar = new Map<string, string>();
    let anterior = 0;
    for (const m of mensajes) {
      // Horas estrictamente crecientes: el orden por creadoEn nunca empata.
      anterior = Math.max(Date.now(), anterior + 1);
      const guardado = await guardarEntrante(m, new Date(anterior));
      if (!guardado) continue;
      if (await permitirClave(claveDe("whatsapp-numero", guardado.telefono), "whatsapp-numero", LIMITES.whatsappNumero)) {
        aProcesar.set(guardado.leadId, m.waMessageId);
      } else {
        console.error("[whatsapp] Un número superó el límite de mensajes: se guarda sin responder");
        if (await permitirClave(claveDe("whatsapp-aviso-numero", guardado.telefono), "whatsapp-aviso-numero", LIMITES.whatsappAvisoNumero)) {
          const config = await obtenerConfigBot();
          after(() =>
            enviarAviso({
              motivo: "RATE_LIMIT",
              destino: destinoAvisos(config.emailAviso),
              lead: { id: guardado.leadId, telefono: guardado.telefono, nombre: null },
            }),
          );
        }
      }
    }
    for (const [leadId, waMessageId] of aProcesar) after(() => procesarMensajeEntrante(leadId, waMessageId));
  } catch (err) {
    // 500: Meta reintenta y la idempotencia evita duplicados.
    console.error(`[whatsapp] Error guardando el webhook: ${resumenError(err)}`);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
