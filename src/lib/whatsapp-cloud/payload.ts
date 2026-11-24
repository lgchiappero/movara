import { z } from "zod";

/** Webhook de WhatsApp Cloud API (campo "messages"). Solo se leen los campos
 * que usa el bot; el resto se ignora (no es estricto: Meta agrega campos). */

const mensajeSchema = z.object({
  from: z.string().regex(/^\d{8,15}$/),
  id: z.string().min(1).max(200),
  timestamp: z.string().regex(/^\d+$/),
  type: z.string(),
  text: z.object({ body: z.string() }).optional(),
  /** Respuesta a un mensaje interactivo: botón (button_reply) o fila de una lista (list_reply). */
  interactive: z
    .object({
      type: z.string(),
      button_reply: z.object({ id: z.string(), title: z.string() }).optional(),
      list_reply: z.object({ id: z.string(), title: z.string() }).optional(),
    })
    .optional(),
  /** Botón de respuesta rápida de una plantilla (no se usan, pero se leen igual). */
  button: z.object({ text: z.string() }).optional(),
});

type MensajeCrudo = z.infer<typeof mensajeSchema>;

/** Lo que tocó el cliente en un botón o una lista, como si lo hubiera
 * escrito: el título de la opción. Null si no es una respuesta a botones. */
export function textoDeRespuestaInteractiva(m: MensajeCrudo): string | null {
  if (m.type === "interactive") return m.interactive?.button_reply?.title ?? m.interactive?.list_reply?.title ?? null;
  if (m.type === "button") return m.button?.text ?? null;
  return null;
}

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
        // La respuesta a un botón o a una lista se guarda como texto: es lo
        // que el cliente eligió y el bot la interpreta igual que si la escribiera.
        const elegido = textoDeRespuestaInteractiva(m);
        const tipo: TipoMensaje = m.type === "text" || elegido !== null ? "TEXTO" : m.type === "audio" ? "AUDIO" : "OTRO";
        mensajes.push({
          waMessageId: m.id,
          telefono: m.from,
          nombrePerfil: nombres.get(m.from) ?? null,
          tipo,
          contenido: tipo === "TEXTO" ? (elegido ?? m.text?.body ?? "").slice(0, 4000) : "",
          enviadoEn: new Date(Number(m.timestamp) * 1000),
        });
      }
      for (const e of change.value.statuses ?? []) estados.push({ waMessageId: e.id, estado: e.status.slice(0, 20) });
    }
  }
  return { mensajes, estados };
}
