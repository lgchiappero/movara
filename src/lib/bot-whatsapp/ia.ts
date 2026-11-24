import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { resumenError } from "@/lib/log-seguro";
import { PROMPT_SISTEMA, FRASE_DERIVACION } from "./prompt";
import { respuestaBotSchema, respuestaUtilizable, type DatosExtraidos, type RespuestaBot } from "./respuesta";
import type { UsoLlamada } from "./gasto";
import { pasaFiltroPalabras } from "./palabras-clave";
import { bloqueEstado, siguientePaso, type Contexto } from "./calificacion";

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
  | { ok: false; motivo: "INVALIDO" | "NEGATIVA" | "ERROR" | "SIN_CLAVE"; uso: UsoLlamada | null };

export interface MotorIA {
  responder(historial: MensajeHistorial[], contexto: Contexto): Promise<ResultadoIA>;
}

function textoDe(m: MensajeHistorial): string {
  if (m.tipo === "AUDIO") return "[mandó un audio]";
  if (m.tipo === "OTRO") return "[mandó un archivo o mensaje que no es texto]";
  return m.contenido;
}

/** Historial → mensajes de la API: el cliente es "user", el bot y el equipo
 * "assistant"; turnos seguidos del mismo rol se unen; arranca y termina con
 * el cliente (Haiku 5.5 no acepta prefill). Los datos del lead NO van acá:
 * van en el bloque de estado del prompt de sistema (ver sistemaDe). */
export function armarMensajes(historial: MensajeHistorial[]): Anthropic.MessageParam[] {
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
  return mensajes;
}

/** Prompt de sistema: la parte fija (en caché) y, después, el bloque con los
 * datos obtenidos y los que faltan de esta conversación. */
export function sistemaDe(contexto: Contexto): Anthropic.TextBlockParam[] {
  return [
    { type: "text", text: PROMPT_SISTEMA, cache_control: { type: "ephemeral" } },
    { type: "text", text: bloqueEstado(contexto) },
  ];
}

export function crearMotorClaude(cliente: Pick<Anthropic, "messages"> = new Anthropic({ timeout: TIMEOUT_IA_MS, maxRetries: 1 })): MotorIA {
  return {
    async responder(historial, contexto) {
      const messages = armarMensajes(historial);
      if (messages.length === 0) return { ok: false, motivo: "INVALIDO", uso: null };
      let uso: UsoLlamada | null = null;
      try {
        const r = await cliente.messages.parse({
          model: MODELO_BOT,
          max_tokens: MAX_TOKENS_BOT,
          system: sistemaDe(contexto),
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

/** Pregunta de la IA simulada para cada combinación de datos que faltan. */
const PREGUNTA_SIMULADA: Record<string, string> = {
  "nombre,uso": "¡Hola! Gracias por escribirnos. Para empezar, ¿me decís tu nombre y apellido y para qué estás pensando la casa?",
  nombre: "¿Me decís tu nombre y apellido?",
  uso: "¿Para qué estás pensando la casa?",
  "zona,terreno": "¿En qué localidad la instalarías y ya tenés terreno?",
  zona: "¿En qué localidad la instalarías?",
  terreno: "¿Ya tenés terreno?",
  "personas,plazo": "¿Cuántas personas la van a usar y para cuándo la necesitás?",
  personas: "¿Cuántas personas la van a usar?",
  plazo: "¿Para cuándo la necesitás?",
};

/** Respuestas por reglas fijas, para el e2e y para probar en local. Sigue
 * los pasos de calificación: el último mensaje del cliente completa, en
 * orden y separados por coma, los datos que faltaban del paso actual.
 * Palabras especiales en el último mensaje: "#invalido" (JSON inválido),
 * "#negativa", "#error", "persona"/"humano" (deriva). */
export const motorSimulado: MotorIA = {
  async responder(historial, { datos, mensajesBot }) {
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
    if (yaHablo) {
      const antes = siguientePaso(extraidos, mensajesBot - 1); // lo que preguntó el mensaje anterior
      const partes = delCliente.at(-1)!.contenido.split(",").map((p) => p.trim()).filter(Boolean);
      if (antes.tipo === "PREGUNTAR") antes.campos.forEach((c, i) => partes[i] && (extraidos[c] = partes[i].slice(0, 200)));
    }
    const siguiente = siguientePaso(extraidos, mensajesBot);
    if (siguiente.tipo === "CERRAR") {
      return { ok: true, uso: USO_SIMULADO, respuesta: { esLead: true, respuesta: "Gracias.", datosExtraidos: extraidos, accion: "CALIFICADO", motivo: "simulado: datos completos" } };
    }
    return {
      ok: true,
      uso: USO_SIMULADO,
      respuesta: { esLead: true, respuesta: PREGUNTA_SIMULADA[siguiente.campos.join(",")], datosExtraidos: extraidos, accion: "RESPONDER", motivo: `simulado: falta ${siguiente.campos.join(" y ")}` },
    };
  },
};

/** Sin ANTHROPIC_API_KEY no se llama a la API: el lead se deriva con un
 * aviso que nombra la causa real. */
export const motorSinClave: MotorIA = {
  async responder() {
    return { ok: false, motivo: "SIN_CLAVE", uso: null };
  },
};

export function motorIA(): MotorIA {
  if (iaSimulada()) return motorSimulado;
  return process.env.ANTHROPIC_API_KEY?.trim() ? crearMotorClaude() : motorSinClave;
}
