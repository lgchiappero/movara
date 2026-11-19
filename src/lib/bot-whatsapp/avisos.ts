import { enviarEmail, esEmailDePrueba } from "@/lib/email/enviar";
import { escapeHtml } from "@/lib/email/escape-html";
import { URL_PUBLICA } from "@/lib/recibos/constantes";
import { resumenError } from "@/lib/log-seguro";
import { formatearTelefonoWhatsapp } from "./telefono";

/** Avisos a Luciano. SOLO por email (Resend): un mensaje de WhatsApp iniciado
 * por la empresa cuesta plata, así que ConfigBot.whatsappAviso queda sin uso. */

export type MotivoAviso = "CALIFICADO" | "DERIVADO" | "AUDIO" | "MAXIMO" | "ERROR" | "RATE_LIMIT" | "GASTO_80";

const ASUNTO: Record<MotivoAviso, string> = {
  CALIFICADO: "Lead calificado por el bot",
  DERIVADO: "El bot te derivó una conversación",
  AUDIO: "Un lead mandó un audio",
  MAXIMO: "Lead derivado: llegó al máximo de respuestas del bot",
  ERROR: "El bot no pudo responder: revisá la conversación",
  RATE_LIMIT: "Un número mandó demasiados mensajes seguidos",
  GASTO_80: "El bot llegó al 80 % del tope de gasto del mes",
};

export type Aviso = {
  motivo: MotivoAviso;
  destino: string | null;
  lead?: { id: string; telefono: string; nombre: string | null };
  detalle?: string;
};

export function linkLead(id: string, base: string = URL_PUBLICA): string {
  return `${base}/admin/bot-whatsapp/${encodeURIComponent(id)}`;
}

/** Destino de los avisos: el de la configuración del bot o CONTACT_EMAIL. */
export function destinoAvisos(emailAviso: string | null): string | null {
  return emailAviso || process.env.CONTACT_EMAIL || null;
}

export function htmlAviso(aviso: Aviso, base: string = URL_PUBLICA): string {
  const partes = [`<p><strong>${escapeHtml(ASUNTO[aviso.motivo])}</strong></p>`];
  if (aviso.lead) {
    const quien = aviso.lead.nombre ? `${aviso.lead.nombre} (${formatearTelefonoWhatsapp(aviso.lead.telefono)})` : formatearTelefonoWhatsapp(aviso.lead.telefono);
    partes.push(`<p>Contacto: ${escapeHtml(quien)}</p>`);
  }
  if (aviso.detalle) partes.push(`<p>${escapeHtml(aviso.detalle)}</p>`);
  const link = aviso.lead ? linkLead(aviso.lead.id, base) : `${base}/admin/bot-whatsapp`;
  partes.push(`<p><a href="${escapeHtml(link)}">Abrir en el panel</a></p>`);
  return partes.join("\n");
}

/** Nunca lanza: un aviso que no sale se registra (sin datos personales). */
export async function enviarAviso(aviso: Aviso): Promise<boolean> {
  if (!aviso.destino) {
    console.error(`[bot-whatsapp] Aviso ${aviso.motivo} sin destino (falta emailAviso o CONTACT_EMAIL)`);
    return false;
  }
  try {
    // Fuera de producción, los destinos @example.* van a la bandeja local (e2e).
    const r = await enviarEmail({ to: aviso.destino, subject: `MOVARA bot: ${ASUNTO[aviso.motivo]}`, html: htmlAviso(aviso) }, { prueba: esEmailDePrueba(aviso.destino) });
    if (!r.ok) console.error(`[bot-whatsapp] No salió el aviso ${aviso.motivo}: ${r.error}`);
    return r.ok;
  } catch (err) {
    console.error(`[bot-whatsapp] No salió el aviso ${aviso.motivo}: ${resumenError(err)}`);
    return false;
  }
}
