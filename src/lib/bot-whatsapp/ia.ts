import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { resumenError } from "@/lib/log-seguro";
import { PROMPT_SISTEMA, FRASE_DERIVACION } from "./prompt";
import { respuestaBotSchema, respuestaUtilizable, type DatosExtraidos, type RespuestaBot } from "./respuesta";
import type { UsoLlamada } from "./gasto";
import { pasaFiltroPalabras } from "./palabras-clave";

/** Conversación con Claude. Clave solo en ANTHROPIC_API_KEY (la lee el SDK). */

export const MODELO_BOT = "claude-haiku-5-5";
/** Haiku 5.5 piensa siempre (adaptativo): max_tokens deja lugar al
 * razonamiento además del JSON, y effort "low" lo mantiene corto. */
export const MAX_TOKENS_BOT = 2048;
export const MAX_MENSAJES_HISTORIAL = 20;
export const TIMEOUT_IA_MS = 25_000;

export type MensajeHistorial = { autor: "CLIENTE" | "BOT" | "EQUIPO"; tipo: "TEXTO" | "AUDIO" | "OTRO"; contenido: string };

export type DatosLead = Partial<Record<keyof DatosExtraidos, string | null>>;

export type ResultadoIA =
  | { ok: true; respuesta: RespuestaBot; uso: UsoLlamada }
  | { ok: false; motivo: "INVALIDO" | "NEGATIVA" | "ERROR"; uso: UsoLlamada | null };

export interface MotorIA {
  responder(historial: MensajeHistorial[], datos: DatosLead): Promise<ResultadoIA>;
}

function textoDe(m: MensajeHistorial): string {
  if (m.tipo === "AUDIO") return "[mandó un audio]";
  if (m.tipo === "OTRO") return "[mandó un archivo o mensaje que no es texto]";
  return m.contenido;
}

/** Historial → mensajes de la API: el cliente es "user", el bot y el equipo
 * "assistant"; turnos seguidos del mismo rol se unen; arranca y termina con
 * el cliente (Haiku 5.5 no acepta prefill). Los datos ya registrados van al
 * final del último turno, así el prompt de sistema queda fijo y cacheable. */
export function armarMensajes(historial: MensajeHistorial[], datos: DatosLead): Anthropic.MessageParam[] {
  const mensajes: { role: "user" | "assistant"; content: string }[] = [];
  for (const m of historial.slice(-MAX_MENSAJES_HISTORIAL)) {
    const role = m.autor === "CLIENTE" ? "user" : "assistant";
    const texto = textoDe(m).trim();
    if (!texto) continue;
    const ultimo = mensajes.at(-1);
    if (ultimo?.role === role) ultimo.content += `\n${texto}`;
    else mensajes.push({ role, content: texto });
  }
  while (mensajes[0]?.role === "assistant") mensajes.shift();
  while (mensajes.at(-1)?.role === "assistant") mensajes.pop();
  const ultimo = mensajes.at(-1);
  if (!ultimo) return [];
  const conocidos = Object.entries(datos).filter(([, v]) => v);
  if (conocidos.length > 0) {
    ultimo.content += `\n\n[Nota del sistema, no la escribió el cliente: datos ya registrados del contacto: ${conocidos.map(([k, v]) => `${k}=${v}`).join("; ")}]`;
  }
  return mensajes;
}

export function crearMotorClaude(cliente: Pick<Anthropic, "messages"> = new Anthropic({ timeout: TIMEOUT_IA_MS, maxRetries: 1 })): MotorIA {
  return {
    async responder(historial, datos) {
      const messages = armarMensajes(historial, datos);
      if (messages.length === 0) return { ok: false, motivo: "INVALIDO", uso: null };
      let uso: UsoLlamada | null = null;
      try {
        const r = await cliente.messages.parse({
          model: MODELO_BOT,
          max_tokens: MAX_TOKENS_BOT,
          system: [{ type: "text", text: PROMPT_SISTEMA, cache_control: { type: "ephemeral" } }],
          messages,
          output_config: { effort: "low", format: zodOutputFormat(respuestaBotSchema) },
        });
        uso = r.usage;
        if (r.stop_reason === "refusal") return { ok: false, motivo: "NEGATIVA", uso };
        const salida = r.parsed_output;
        if (!salida || !respuestaUtilizable(salida)) return { ok: false, motivo: "INVALIDO", uso };
        return { ok: true, respuesta: salida, uso };
      } catch (err) {
        // El SDK lanza AnthropicError si el JSON no valida contra el esquema
        // (no es un APIError: la llamada se hizo y se cobró).
        if (err instanceof Anthropic.AnthropicError && !(err instanceof Anthropic.APIError)) return { ok: false, motivo: "INVALIDO", uso };
        console.error(`[bot-whatsapp] Falló la llamada a Claude: ${resumenError(err)}`);
        return { ok: false, motivo: "ERROR", uso };
      }
    },
  };
}

/* ---------- IA simulada (sin clave): BOT_IA_SIMULADA=1, nunca en producción ---------- */

export function iaSimulada(): boolean {
  return process.env.BOT_IA_SIMULADA === "1" && process.env.NODE_ENV !== "production";
}

const USO_SIMULADO: UsoLlamada = { input_tokens: 300, output_tokens: 120, cache_creation_input_tokens: 0, cache_read_input_tokens: 2500 };

/** Orden en que la IA simulada pide los datos y la pregunta de cada uno. */
const PREGUNTAS: [Exclude<keyof DatosExtraidos, "origen">, string][] = [
  ["uso", "¡Hola! Qué bueno que nos escribas. Contame, ¿la pensás para vivir, para alquilar…?"],
  ["zona", "¡Qué lindo proyecto! ¿Por qué zona sería?"],
  ["plazo", "Buenísimo. ¿Para cuándo te imaginás tenerla?"],
  ["nombre", "Perfecto. ¿Me decís tu nombre así le paso todo a Luciano?"],
];

/** Respuestas por reglas fijas, para el e2e y para probar en local. Palabras
 * especiales en el último mensaje: "#invalido" (JSON inválido), "#negativa",
 * "#error", "persona"/"humano" (deriva). */
export const motorSimulado: MotorIA = {
  async responder(historial, datos) {
    const delCliente = historial.filter((m) => m.autor === "CLIENTE" && m.tipo === "TEXTO");
    const ultimo = delCliente.at(-1)?.contenido.toLowerCase() ?? "";
    if (ultimo.includes("#invalido")) return { ok: false, motivo: "INVALIDO", uso: USO_SIMULADO };
    if (ultimo.includes("#negativa")) return { ok: false, motivo: "NEGATIVA", uso: USO_SIMULADO };
    if (ultimo.includes("#error")) return { ok: false, motivo: "ERROR", uso: null };

    const vacios: DatosExtraidos = { nombre: null, uso: null, zona: null, terreno: null, personas: null, plazo: null, origen: null, origenDetalle: null };
    const extraidos: DatosExtraidos = { ...vacios, ...Object.fromEntries(Object.entries(datos).filter(([k]) => k in vacios)) } as DatosExtraidos;
    const yaHablo = historial.some((m) => m.autor === "BOT");
    if (!yaHablo && !delCliente.some((m) => pasaFiltroPalabras(m.contenido))) {
      return { ok: true, uso: USO_SIMULADO, respuesta: { esLead: false, respuesta: "", datosExtraidos: extraidos, accion: "NO_RESPONDER", motivo: "simulado: no menciona MOVARA" } };
    }
    if (/\b(persona|humano)\b/.test(ultimo)) {
      return { ok: true, uso: USO_SIMULADO, respuesta: { esLead: true, respuesta: `Claro. ${FRASE_DERIVACION}`, datosExtraidos: extraidos, accion: "DERIVAR", motivo: "simulado: pide una persona" } };
    }
    // El último mensaje del cliente responde al primer dato que faltaba.
    if (yaHablo) {
      const pendiente = PREGUNTAS.find(([campo]) => !extraidos[campo]);
      if (pendiente) extraidos[pendiente[0]] = delCliente.at(-1)!.contenido.slice(0, 200);
    }
    const siguiente = PREGUNTAS.find(([campo]) => !extraidos[campo]);
    if (!siguiente) {
      return {
        ok: true,
        uso: USO_SIMULADO,
        respuesta: { esLead: true, respuesta: `Gracias, ${extraidos.nombre}. Luciano te arma la propuesta y te escribe personalmente.`, datosExtraidos: extraidos, accion: "CALIFICADO", motivo: "simulado: datos completos" },
      };
    }
    return { ok: true, uso: USO_SIMULADO, respuesta: { esLead: true, respuesta: siguiente[1], datosExtraidos: extraidos, accion: "RESPONDER", motivo: `simulado: falta ${siguiente[0]}` } };
  },
};

export function motorIA(): MotorIA {
  return iaSimulada() ? motorSimulado : crearMotorClaude();
}
