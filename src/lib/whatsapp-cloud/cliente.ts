import { resumenError } from "@/lib/log-seguro";

/** Envío por WhatsApp Cloud API (Graph API). Credenciales solo por variables
 * de entorno: WHATSAPP_ACCESS_TOKEN y WHATSAPP_PHONE_NUMBER_ID. Nunca se
 * loguean ni el token ni el número ni el texto. */

/** Versión de la Graph API. v26.0 es la última del changelog oficial
 * (developers.facebook.com/docs/graph-api/changelog/versions, 29/07/2026). */
export const GRAPH_API_VERSION = "v26.0";

export type ResultadoEnvio = { ok: true; waMessageId: string | null } | { ok: false; error: string };

/** Opciones de un mensaje interactivo. Límites de Meta: botones (hasta 3,
 * título de hasta 20 caracteres) o lista (hasta 10 filas de hasta 24, con
 * un botón para abrirla de hasta 20). El id vuelve en la respuesta del
 * cliente; el título es lo que el cliente ve y lo que se guarda. */
export type OpcionInteractiva = { id: string; titulo: string };
export type Interactivo = { tipo: "botones"; opciones: OpcionInteractiva[] } | { tipo: "lista"; boton: string; opciones: OpcionInteractiva[] };

export const LIMITES_INTERACTIVO = { botones: 3, tituloBoton: 20, filas: 10, tituloFila: 24, botonLista: 20, cuerpo: 1024 } as const;

/** Cuerpo de la Graph API para un mensaje interactivo (type "interactive",
 * "button" o "list"). Tira un error si no respeta los límites de Meta: es un
 * error de programación (las opciones son fijas), no del cliente. */
export function cuerpoInteractivo(texto: string, interactivo: Interactivo): Record<string, unknown> {
  const L = LIMITES_INTERACTIVO;
  const { opciones } = interactivo;
  const maxTitulo = interactivo.tipo === "botones" ? L.tituloBoton : L.tituloFila;
  const maxOpciones = interactivo.tipo === "botones" ? L.botones : L.filas;
  if (!texto.trim() || texto.length > L.cuerpo) throw new Error("Texto inválido para un mensaje interactivo");
  if (opciones.length === 0 || opciones.length > maxOpciones || opciones.some((o) => !o.titulo || o.titulo.length > maxTitulo || !o.id || o.id.length > 200)) {
    throw new Error("Opciones inválidas para un mensaje interactivo");
  }
  if (interactivo.tipo === "botones") {
    return {
      type: "interactive",
      interactive: { type: "button", body: { text: texto }, action: { buttons: opciones.map((o) => ({ type: "reply", reply: { id: o.id, title: o.titulo } })) } },
    };
  }
  if (!interactivo.boton || interactivo.boton.length > L.botonLista) throw new Error("Botón de lista inválido");
  return {
    type: "interactive",
    interactive: { type: "list", body: { text: texto }, action: { button: interactivo.boton, sections: [{ rows: opciones.map((o) => ({ id: o.id, title: o.titulo })) }] } },
  };
}

export interface ClienteWhatsapp {
  /** Marca el mensaje como leído y muestra "escribiendo…" (hasta 25 s o
   * hasta que llega la respuesta). */
  marcarLeidoYEscribiendo(waMessageId: string): Promise<void>;
  /** Texto solo o, con `interactivo`, con botones o una lista debajo. */
  enviarTexto(telefono: string, texto: string, interactivo?: Interactivo | null): Promise<ResultadoEnvio>;
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

/** Error 131030 de Meta: el destinatario no está en la lista de números
 * permitidos del número de prueba. */
export const CODIGO_DESTINATARIO_NO_PERMITIDO = 131030;

type ErrorMeta = { code?: unknown; error_subcode?: unknown; title?: unknown; message?: unknown };

/** Resumen apto para el log de un error de envío de Meta: HTTP, código,
 * subcódigo y título. Nunca el número ni el texto: se descartan
 * `error_data.details` y cualquier tira de 6 o más dígitos del título. */
export function resumenErrorMeta(status: number, json: unknown): { texto: string; codigo: number | null; titulo: string } {
  const e = ((json as { error?: ErrorMeta } | null)?.error ?? {}) as ErrorMeta;
  const codigo = typeof e.code === "number" ? e.code : null;
  const subcodigo = typeof e.error_subcode === "number" ? e.error_subcode : null;
  const crudo = typeof e.title === "string" && e.title ? e.title : typeof e.message === "string" ? e.message : "";
  const titulo = crudo
    .replace(/^\(#\d+\)\s*/, "")
    .replace(/\+?\d[\d\s-]{5,}\d/g, "[número]")
    .slice(0, 120)
    .trim();
  const partes = [`HTTP ${status}`, codigo !== null && `código ${codigo}`, subcodigo !== null && `subcódigo ${subcodigo}`, titulo].filter(Boolean);
  return { texto: partes.join(" · "), codigo, titulo };
}

function esDestinatarioNoPermitido(codigo: number | null, titulo: string): boolean {
  return codigo === CODIGO_DESTINATARIO_NO_PERMITIDO || /not in allowed list|no est[aá] en la lista|no permitido/i.test(titulo);
}

/** Celular argentino como lo manda WhatsApp (549 + característica + número,
 * 13 dígitos) → el mismo sin el 9 (54 + característica + número). Es el
 * formato que espera la lista de destinatarios del número de prueba. */
export function sinNueveArgentino(telefono: string): string | null {
  return /^549\d{10}$/.test(telefono) ? `54${telefono.slice(3)}` : null;
}

async function enviarUnaVez(telefono: string, contenido: Record<string, unknown>): Promise<ResultadoEnvio & { codigo?: number | null; titulo?: string }> {
  try {
    const res = await llamarGraph({ recipient_type: "individual", to: telefono, ...contenido });
    const json = (await res.json().catch(() => null)) as { messages?: { id?: string }[] } | null;
    if (!res.ok) {
      const r = resumenErrorMeta(res.status, json);
      return { ok: false, error: r.texto, codigo: r.codigo, titulo: r.titulo };
    }
    return { ok: true, waMessageId: json?.messages?.[0]?.id ?? null };
  } catch (err) {
    return { ok: false, error: resumenError(err) };
  }
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
  async enviarTexto(telefono, texto, interactivo) {
    let contenido: Record<string, unknown>;
    try {
      contenido = interactivo ? cuerpoInteractivo(texto, interactivo) : { type: "text", text: { body: texto } };
    } catch (err) {
      return { ok: false, error: resumenError(err) };
    }
    const primero = await enviarUnaVez(telefono, contenido);
    if (primero.ok) return { ok: true, waMessageId: primero.waMessageId };
    // Caso conocido de Argentina con el número de prueba: la lista de
    // permitidos guarda el número sin el 9. Un solo reintento, y solo ante
    // "destinatario no permitido": con el número real nunca se llega acá.
    const alternativo = sinNueveArgentino(telefono);
    if (!alternativo || !esDestinatarioNoPermitido(primero.codigo ?? null, primero.titulo ?? "")) return { ok: false, error: primero.error };
    const segundo = await enviarUnaVez(alternativo, contenido);
    if (segundo.ok) {
      console.info("[whatsapp] Envío OK con el formato argentino sin 9 (54 + característica + número) después de un 131030 con 549");
      return { ok: true, waMessageId: segundo.waMessageId };
    }
    return { ok: false, error: `549: ${primero.error} | sin 9: ${segundo.error}` };
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
