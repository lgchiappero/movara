import type { HorarioAtencion, ModoRespaldo } from "./constantes";
import { VENTANA_24H_MS } from "./constantes";
import { dentroDeHorario } from "./horario";
import { pasaFiltroPalabras } from "./palabras-clave";

/** Cuándo responde el bot. Función pura: todo lo que necesita viene en la
 * entrada, así se prueba cada regla por separado. */

export type EntradaDecision = {
  config: {
    activo: boolean;
    modoHorario: boolean;
    horarioAtencion: HorarioAtencion;
    modoRespaldo: ModoRespaldo;
    maxRespuestasPorLead: number;
  };
  /** Gasto del mes / tope (1 = tope alcanzado). */
  porcentajeGasto: number;
  excluido: boolean;
  lead: {
    estado: string;
    controlHumano: boolean;
    respuestasBot: number;
    bienvenidaEnviadaEn: Date | null;
    ultimoEntranteEn: Date | null;
    /** Sin mensajes anteriores a los pendientes ni respuestas del bot. */
    esNuevo: boolean;
  };
  /** Mensajes del cliente todavía sin respuesta, en orden. */
  pendientes: { tipo: "TEXTO" | "AUDIO" | "OTRO"; contenido: string }[];
  /** Primer mensaje del número (para el filtro sin IA de la bienvenida). */
  primerMensaje: string | null;
  ahora: Date;
};

export type MotivoSilencio =
  | "SIN_PENDIENTES"
  | "PAUSADO"
  | "EN_HORARIO"
  | "EXCLUIDO"
  | "CONTROL_HUMANO"
  | "DESCARTADO"
  | "FUERA_DE_VENTANA"
  | "SIN_SALDO";

export type Decision =
  | { tipo: "NADA"; motivo: MotivoSilencio }
  | { tipo: "BIENVENIDA" }
  | { tipo: "MAXIMO" }
  | { tipo: "AUDIO" }
  | { tipo: "IA"; conAudio: boolean };

export function decidir(e: EntradaDecision): Decision {
  if (e.pendientes.length === 0) return { tipo: "NADA", motivo: "SIN_PENDIENTES" };
  // Pausado a mano: no responde nada (los mensajes ya quedaron guardados).
  if (!e.config.activo) return { tipo: "NADA", motivo: "PAUSADO" };
  // Modo horario: solo responde fuera del horario de atención.
  if (e.config.modoHorario && dentroDeHorario(e.config.horarioAtencion, e.ahora)) return { tipo: "NADA", motivo: "EN_HORARIO" };
  if (e.excluido) return { tipo: "NADA", motivo: "EXCLUIDO" };
  if (e.lead.controlHumano) return { tipo: "NADA", motivo: "CONTROL_HUMANO" };
  if (e.lead.estado === "DESCARTADO") return { tipo: "NADA", motivo: "DESCARTADO" };
  // Solo dentro de la ventana de 24 h desde el último mensaje del cliente:
  // nunca inicia conversaciones ni usa plantillas.
  if (!e.lead.ultimoEntranteEn || e.ahora.getTime() - e.lead.ultimoEntranteEn.getTime() >= VENTANA_24H_MS) {
    return { tipo: "NADA", motivo: "FUERA_DE_VENTANA" };
  }
  // Tope de gasto alcanzado (bot activo): bienvenida una sola vez, solo a
  // números nuevos cuyo primer mensaje pase el filtro de palabras sin IA.
  if (e.porcentajeGasto >= 1) {
    const corresponde =
      e.config.modoRespaldo === "MENSAJE_BIENVENIDA" &&
      e.lead.esNuevo &&
      !e.lead.bienvenidaEnviadaEn &&
      e.primerMensaje !== null &&
      pasaFiltroPalabras(e.primerMensaje);
    return corresponde ? { tipo: "BIENVENIDA" } : { tipo: "NADA", motivo: "SIN_SALDO" };
  }
  if (e.lead.respuestasBot >= e.config.maxRespuestasPorLead) return { tipo: "MAXIMO" };
  const hayTexto = e.pendientes.some((m) => m.tipo === "TEXTO" && m.contenido.trim());
  const hayNoTexto = e.pendientes.some((m) => m.tipo !== "TEXTO");
  if (!hayTexto) return { tipo: "AUDIO" };
  return { tipo: "IA", conAudio: hayNoTexto };
}

/** Demora antes de mandar: de 5 a 20 s según el largo, como si alguien
 * escribiera. Nunca más de 30 s en total desde que se empezó a "escribir". */
export const DEMORA_MIN_MS = 5_000;
export const DEMORA_MAX_MS = 20_000;
export const DEMORA_TOPE_MS = 30_000;
export const MS_POR_CARACTER = 60;

export function demoraObjetivo(texto: string): number {
  return Math.min(DEMORA_MAX_MS, Math.max(DEMORA_MIN_MS, texto.length * MS_POR_CARACTER));
}

/** Lo que falta esperar después de lo que ya tardó la IA. */
export function demoraRestante(texto: string, transcurridoMs: number): number {
  const objetivo = Math.min(demoraObjetivo(texto), DEMORA_TOPE_MS);
  return Math.max(0, objetivo - transcurridoMs);
}
