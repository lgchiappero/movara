import { z } from "zod";

/** Webhook de WhatsApp Cloud API (campo "messages"). Solo se leen los campos
 * que usa el bot; el resto se ignora (no es estricto: Meta agrega campos). */

const mensajeSchema = z.object({
  from: z.string().regex(/^\d{8,15}$/),
  id: z.string().min(1).max(200),
  timestamp: z.string().regex(/^\d+$/),
  type: z.string(),
  text: z.object({ body: z.string() }).optional(),
});

const estadoSchema = z.object({
  id: z.string().min(1).max(200),
  status: z.string(),
});

const valorSchema = z.object({
  messaging_product: z.literal("whatsapp").optional(),
  contacts: z.array(z.object({ wa_id: z.string(), profile: z.object({ name: z.string() }).partial().optional() })).optional(),
  messages: z.array(mensajeSchema).optional(),
  statuses: z.array(estadoSchema).optional(),
});

export const webhookSchema = z.object({
  object: z.literal("whatsapp_business_account"),
  entry: z.array(z.object({ changes: z.array(z.object({ field: z.string(), value: valorSchema })) })),
});

export type TipoMensaje = "TEXTO" | "AUDIO" | "OTRO";

export type MensajeEntrante = {
  waMessageId: string;
  telefono: string; // como lo manda WhatsApp: solo dígitos, con código de país
  nombrePerfil: string | null;
  tipo: TipoMensaje;
  contenido: string;
  enviadoEn: Date;
};

export type EstadoEntrega = { waMessageId: string; estado: string };

/** Mensajes y estados de entrega de un webhook ya validado por firma. Un
 * payload que no es de WhatsApp o no tiene la forma esperada da listas vacías. */
export function leerWebhook(datos: unknown): { mensajes: MensajeEntrante[]; estados: EstadoEntrega[] } {
  const parsed = webhookSchema.safeParse(datos);
  if (!parsed.success) return { mensajes: [], estados: [] };
  const mensajes: MensajeEntrante[] = [];
  const estados: EstadoEntrega[] = [];
  for (const entry of parsed.data.entry) {
    for (const change of entry.changes) {
      if (change.field !== "messages") continue;
      const nombres = new Map((change.value.contacts ?? []).map((c) => [c.wa_id, c.profile?.name?.trim() || null]));
      for (const m of change.value.messages ?? []) {
        const tipo: TipoMensaje = m.type === "text" ? "TEXTO" : m.type === "audio" ? "AUDIO" : "OTRO";
        mensajes.push({
          waMessageId: m.id,
          telefono: m.from,
          nombrePerfil: nombres.get(m.from) ?? null,
          tipo,
          contenido: tipo === "TEXTO" ? (m.text?.body ?? "").slice(0, 4000) : "",
          enviadoEn: new Date(Number(m.timestamp) * 1000),
        });
      }
      for (const e of change.value.statuses ?? []) estados.push({ waMessageId: e.id, estado: e.status.slice(0, 20) });
    }
  }
  return { mensajes, estados };
}
