import { resumenError } from "@/lib/log-seguro";

/** Envío por WhatsApp Cloud API (Graph API). Credenciales solo por variables
 * de entorno: WHATSAPP_ACCESS_TOKEN y WHATSAPP_PHONE_NUMBER_ID. Nunca se
 * loguean ni el token ni el número ni el texto. */

/** Versión de la Graph API. v26.0 es la última del changelog oficial
 * (developers.facebook.com/docs/graph-api/changelog/versions, 29/07/2026). */
export const GRAPH_API_VERSION = "v26.0";

export type ResultadoEnvio = { ok: true; waMessageId: string | null } | { ok: false; error: string };

export interface ClienteWhatsapp {
  /** Marca el mensaje como leído y muestra "escribiendo…" (hasta 25 s o
   * hasta que llega la respuesta). */
  marcarLeidoYEscribiendo(waMessageId: string): Promise<void>;
  enviarTexto(telefono: string, texto: string): Promise<ResultadoEnvio>;
}

/** Solo fuera de producción: con WHATSAPP_SIMULADO=1 no se llama a Meta. */
export function whatsappSimulado(): boolean {
  return process.env.WHATSAPP_SIMULADO === "1" && process.env.NODE_ENV !== "production";
}

async function llamarGraph(cuerpo: Record<string, unknown>): Promise<Response> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const numeroId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !numeroId) throw new Error("WhatsApp no configurado");
  return fetch(`https://graph.facebook.com/${GRAPH_API_VERSION}/${numeroId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", ...cuerpo }),
    signal: AbortSignal.timeout(10_000),
  });
}

export const clienteWhatsappReal: ClienteWhatsapp = {
  async marcarLeidoYEscribiendo(waMessageId) {
    try {
      const res = await llamarGraph({ status: "read", message_id: waMessageId, typing_indicator: { type: "text" } });
      if (!res.ok) console.error(`[whatsapp] No se pudo marcar como leído: HTTP ${res.status}`);
    } catch (err) {
      console.error(`[whatsapp] No se pudo marcar como leído: ${resumenError(err)}`);
    }
  },
  async enviarTexto(telefono, texto) {
    try {
      const res = await llamarGraph({ recipient_type: "individual", to: telefono, type: "text", text: { body: texto } });
      const json = (await res.json().catch(() => null)) as { messages?: { id?: string }[] } | null;
      if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
      return { ok: true, waMessageId: json?.messages?.[0]?.id ?? null };
    } catch (err) {
      return { ok: false, error: resumenError(err) };
    }
  },
};

let simulados = 0;
/** No llama a Meta: el mensaje igual se guarda en la base como saliente. */
export const clienteWhatsappSimulado: ClienteWhatsapp = {
  async marcarLeidoYEscribiendo() {},
  async enviarTexto() {
    simulados += 1;
    return { ok: true, waMessageId: `wamid.simulado.${Date.now()}.${simulados}` };
  },
};

export function clienteWhatsapp(): ClienteWhatsapp {
  return whatsappSimulado() ? clienteWhatsappSimulado : clienteWhatsappReal;
}
