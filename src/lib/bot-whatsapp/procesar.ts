import type { LeadWhatsapp } from "@prisma/client";
import { db } from "@/lib/db";
import { resumenError } from "@/lib/log-seguro";
import { clienteWhatsapp, type ClienteWhatsapp, type Interactivo } from "@/lib/whatsapp-cloud/cliente";
import { enviarAviso, destinoAvisos, type Aviso, type MotivoAviso } from "./avisos";
import { obtenerConfigBot, gastoDelMes } from "./config";
import { MENSAJE_CIERRE_MAXIMO, MENSAJE_SIN_AUDIO, ORIGENES, type HorarioAtencion, type ModoRespaldo } from "./constantes";
import { registrarUso } from "./gasto";
import { MAX_MENSAJES_HISTORIAL, motorIA, type DatosLead, type MotorIA } from "./ia";
import { decidir, demoraRestante, type Decision } from "./reglas";
import { contenidoConOpciones } from "./calificacion";
import { generarTurno } from "./turno";
import type { DatosExtraidos } from "./respuesta";

/** Procesa los mensajes de un lead DESPUÉS de responderle 200 a Meta (corre
 * dentro de after(), con maxDuration = 60 s en el webhook):
 *  1. espera unos segundos por si el cliente sigue escribiendo; si llegó otro
 *     mensaje, termina: lo atiende la invocación de ese último mensaje;
 *  2. toma el bloqueo del lead (update condicional en la base) para que
 *     nunca salgan dos respuestas a la vez;
 *  3. decide con las reglas (reglas.ts) y responde una sola vez a todos los
 *     mensajes pendientes, con "escribiendo…" y una demora humana. */

export const ESPERA_AGRUPAR_MS = 6_000;
export const BLOQUEO_MS = 60_000;
export const REINTENTO_BLOQUEO_MS = 3_000;
export const MAX_ESPERA_BLOQUEO_MS = 36_000;

export type Dependencias = {
  ia: MotorIA;
  whatsapp: ClienteWhatsapp;
  esperar: (ms: number) => Promise<void>;
  ahora: () => Date;
  avisar: (aviso: Aviso) => Promise<boolean>;
};

/** Solo e2e: con E2E_BOT_RAPIDO=1 (nunca en producción) las esperas duran
 * el 5 %, así una conversación entera entra en el tiempo de un test. */
export function factorEsperas(): number {
  return process.env.E2E_BOT_RAPIDO === "1" && process.env.NODE_ENV !== "production" ? 0.05 : 1;
}

export function dependenciasReales(): Dependencias {
  const factor = factorEsperas();
  return {
    ia: motorIA(),
    whatsapp: clienteWhatsapp(),
    esperar: (ms) => new Promise((ok) => setTimeout(ok, ms * factor)),
    ahora: () => new Date(),
    avisar: enviarAviso,
  };
}

export type Resultado =
  | "OTRO_MENSAJE_MAS_NUEVO"
  | "SIN_BLOQUEO"
  | "SIN_LEAD"
  | `NADA_${string}`
  | "RESPONDIDO"
  | "NO_ES_LEAD"
  | "NO_RESPONDER"
  | "ERROR_IA"
  | "ERROR_ENVIO";

/** Nunca lanza: un error se registra (sin datos personales) y se avisa.
 * Cada mensaje deja en el log qué decidió el bot (solo el código del
 * resultado, por ejemplo NADA_EN_HORARIO o RESPONDIDO: sin número ni texto),
 * para saber por qué no respondió sin consultar la base. */
export async function procesarMensajeEntrante(leadId: string, waMessageId: string, deps: Dependencias = dependenciasReales()): Promise<Resultado> {
  const resultado = await procesarSinLog(leadId, waMessageId, deps);
  console.info(`[bot-whatsapp] Resultado: ${resultado}`);
  return resultado;
}

async function procesarSinLog(leadId: string, waMessageId: string, deps: Dependencias): Promise<Resultado> {
  try {
    await deps.esperar(ESPERA_AGRUPAR_MS);
    const ultimo = await db.mensajeWhatsapp.findFirst({ where: { leadId, direccion: "ENTRANTE" }, orderBy: { creadoEn: "desc" } });
    if (!ultimo) return "SIN_LEAD"; // lo borraron desde el panel (los mensajes van en cascada)
    if (ultimo.waMessageId !== waMessageId) return "OTRO_MENSAJE_MAS_NUEVO";

    if (!(await tomarBloqueo(leadId, deps))) {
      console.error("[bot-whatsapp] No se pudo tomar el bloqueo del lead: queda sin responder");
      return "SIN_BLOQUEO";
    }
    try {
      return await procesarConBloqueo(leadId, deps);
    } finally {
      await db.leadWhatsapp.update({ where: { id: leadId }, data: { bloqueoHasta: null } }).catch(() => undefined);
    }
  } catch (err) {
    console.error(`[bot-whatsapp] Error procesando un mensaje: ${resumenError(err)}`);
    return "ERROR_IA";
  }
}

async function tomarBloqueo(leadId: string, deps: Dependencias): Promise<boolean> {
  for (let esperado = 0; ; esperado += REINTENTO_BLOQUEO_MS) {
    const ahora = deps.ahora();
    const r = await db.leadWhatsapp.updateMany({
      where: { id: leadId, OR: [{ bloqueoHasta: null }, { bloqueoHasta: { lt: ahora } }] },
      data: { bloqueoHasta: new Date(ahora.getTime() + BLOQUEO_MS) },
    });
    if (r.count === 1) return true;
    if (esperado >= MAX_ESPERA_BLOQUEO_MS) return false;
    await deps.esperar(REINTENTO_BLOQUEO_MS);
  }
}

/** Detalle del email cuando la IA no da una respuesta usable. */
export const DETALLE_ERROR_IA = {
  INVALIDO: "La respuesta de la IA no fue válida.",
  NEGATIVA: "La IA no quiso responder.",
  ERROR: "Falló la llamada a la IA.",
  SIN_CLAVE: "Falta la clave de la IA (ANTHROPIC_API_KEY en Vercel).",
} as const;

const CAMPOS: (keyof DatosExtraidos)[] = ["nombre", "uso", "zona", "terreno", "personas", "plazo", "origen", "origenDetalle"];

function datosDelLead(lead: LeadWhatsapp): DatosLead {
  return Object.fromEntries(CAMPOS.map((c) => [c, lead[c]]));
}

/** Solo completa lo que está vacío: nunca pisa lo que cargó el equipo. */
export function datosNuevos(lead: LeadWhatsapp, extraidos: DatosExtraidos): Partial<Record<keyof DatosExtraidos, string>> {
  const cambios: Partial<Record<keyof DatosExtraidos, string>> = {};
  for (const c of CAMPOS) {
    const v = extraidos[c]?.trim();
    if (!v || lead[c]) continue;
    if (c === "origen" && !(ORIGENES as readonly string[]).includes(v)) continue;
    cambios[c] = v.slice(0, 200);
  }
  return cambios;
}

async function procesarConBloqueo(leadId: string, deps: Dependencias): Promise<Resultado> {
  const lead = await db.leadWhatsapp.findUnique({ where: { id: leadId } });
  if (!lead) return "SIN_LEAD";
  const recientes = (await db.mensajeWhatsapp.findMany({ where: { leadId }, orderBy: { creadoEn: "desc" }, take: 50 })).reverse();
  const ultimaSalida = recientes.findLastIndex((m) => m.direccion === "SALIENTE");
  const pendientes = recientes.slice(ultimaSalida + 1).filter((m) => m.direccion === "ENTRANTE");
  const esNuevo = ultimaSalida === -1 && lead.respuestasBot === 0 && pendientes.length === recientes.length;

  const config = await obtenerConfigBot();
  const gasto = await gastoDelMes(config.topeGastoMensualUsd, deps.ahora());
  const excluido = await db.contactoExcluido.findUnique({ where: { telefono: lead.telefono } });

  const decision: Decision = decidir({
    config: {
      activo: config.activo,
      modoHorario: config.modoHorario,
      horarioAtencion: config.horarioAtencion as HorarioAtencion,
      modoRespaldo: config.modoRespaldo as ModoRespaldo,
      maxRespuestasPorLead: config.maxRespuestasPorLead,
    },
    porcentajeGasto: gasto.porcentaje,
    excluido: excluido !== null,
    lead: {
      estado: lead.estado,
      controlHumano: lead.controlHumano,
      respuestasBot: lead.respuestasBot,
      bienvenidaEnviadaEn: lead.bienvenidaEnviadaEn,
      ultimoEntranteEn: lead.ultimoEntranteEn,
      esNuevo,
    },
    pendientes: pendientes.map((m) => ({ tipo: m.tipo as "TEXTO" | "AUDIO" | "OTRO", contenido: m.contenido })),
    primerMensaje: esNuevo ? (pendientes.find((m) => m.tipo === "TEXTO")?.contenido ?? null) : null,
    ahora: deps.ahora(),
  });
  if (decision.tipo === "NADA") return `NADA_${decision.motivo}`;

  const destino = destinoAvisos(config.emailAviso);
  const avisar = (motivo: MotivoAviso, detalle?: string) =>
    deps.avisar({ motivo, destino, lead: { id: lead.id, telefono: lead.telefono, nombre: lead.nombre }, detalle });

  // Leído + "escribiendo…" sobre el último mensaje del cliente.
  const ultimoPendiente = pendientes.at(-1)!;
  if (ultimoPendiente.waMessageId) await deps.whatsapp.marcarLeidoYEscribiendo(ultimoPendiente.waMessageId);
  const inicio = deps.ahora().getTime();

  const enviar = async (texto: string, extra: Record<string, unknown> = {}, interactivo: Interactivo | null = null): Promise<boolean> => {
    await deps.esperar(demoraRestante(texto, deps.ahora().getTime() - inicio));
    const r = await deps.whatsapp.enviarTexto(lead.telefono, texto, interactivo);
    if (!r.ok) {
      console.error(`[bot-whatsapp] No se pudo enviar por WhatsApp: ${r.error}`);
      await avisar("ERROR", "No se pudo enviar la respuesta por WhatsApp.");
      return false;
    }
    const ahora = deps.ahora();
    await db.mensajeWhatsapp.create({
      data: { leadId, direccion: "SALIENTE", autor: "BOT", tipo: "TEXTO", contenido: contenidoConOpciones(texto, interactivo), waMessageId: r.waMessageId, estadoEntrega: "sent", creadoEn: ahora },
    });
    await db.leadWhatsapp.update({ where: { id: leadId }, data: { respuestasBot: { increment: 1 }, ultimoMensajeEn: ahora, ...extra } });
    return true;
  };
  const derivar = (estado: "CALIFICADO" | "DERIVADO") => db.leadWhatsapp.update({ where: { id: leadId }, data: { estado, controlHumano: true } });

  if (decision.tipo === "BIENVENIDA") {
    return (await enviar(config.mensajeBienvenida, { bienvenidaEnviadaEn: deps.ahora() })) ? "RESPONDIDO" : "ERROR_ENVIO";
  }
  if (decision.tipo === "MAXIMO") {
    if (!(await enviar(MENSAJE_CIERRE_MAXIMO))) return "ERROR_ENVIO";
    await derivar("DERIVADO");
    await avisar("MAXIMO");
    return "RESPONDIDO";
  }
  if (decision.tipo === "AUDIO") {
    if (!(await enviar(MENSAJE_SIN_AUDIO))) return "ERROR_ENVIO";
    await avisar("AUDIO");
    return "RESPONDIDO";
  }

  // decision.tipo === "IA": historial + datos obtenidos y faltantes (del
  // lead guardado) y cuántos mensajes ya mandó el bot.
  const turno = await generarTurno(
    deps.ia,
    recientes.slice(-MAX_MENSAJES_HISTORIAL).map((m) => ({ autor: m.autor as "CLIENTE" | "BOT" | "EQUIPO", tipo: m.tipo as "TEXTO" | "AUDIO" | "OTRO", contenido: m.contenido })),
    { datos: datosDelLead(lead), mensajesBot: lead.respuestasBot },
    lead.id,
  );
  for (const uso of turno.usos) {
    const { avisarOchenta } = await registrarUso(uso, config.topeGastoMensualUsd, deps.ahora());
    if (avisarOchenta) await deps.avisar({ motivo: "GASTO_80", destino });
  }
  if (!turno.ok) {
    // JSON inválido, negativa o error: deriva a Luciano y NO responde.
    await derivar("DERIVADO");
    await avisar("ERROR", DETALLE_ERROR_IA[turno.motivo]);
    return "ERROR_IA";
  }

  const r = turno.respuesta;
  const cambios = datosNuevos(lead, r.datosExtraidos);
  if (!r.esLead) {
    // Número nuevo que no es un posible cliente: queda para Luciano.
    if (lead.respuestasBot === 0) await db.leadWhatsapp.update({ where: { id: leadId }, data: { estado: "DESCARTADO" } });
    return "NO_ES_LEAD";
  }
  if (Object.keys(cambios).length > 0) await db.leadWhatsapp.update({ where: { id: leadId }, data: cambios });
  if (r.accion === "NO_RESPONDER") return "NO_RESPONDER";

  if (!(await enviar(turno.texto, {}, turno.interactivo))) return "ERROR_ENVIO";
  if (r.accion === "CALIFICADO") {
    await derivar("CALIFICADO");
    await avisar("CALIFICADO", r.motivo);
  } else if (r.accion === "DERIVAR") {
    await derivar("DERIVADO");
    await avisar("DERIVADO", r.motivo);
  }
  if (decision.conAudio) await avisar("AUDIO");
  return "RESPONDIDO";
}
