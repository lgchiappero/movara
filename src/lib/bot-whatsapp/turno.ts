import type { Interactivo } from "@/lib/whatsapp-cloud/cliente";
import type { UsoLlamada } from "./gasto";
import type { MensajeHistorial, MotorIA, ResultadoIA } from "./ia";
import type { RespuestaBot } from "./respuesta";
import {
  CAMPOS_CALIFICACION,
  OPCIONES,
  camposPreguntados,
  escribeLasOpciones,
  frasesProhibidas,
  opcionesPara,
  problemaDeRespuesta,
  siguientePaso,
  textoCierre,
  textoCorreccion,
  type Contexto,
  type DatosCalificacion,
} from "./calificacion";

/** Un turno del bot: llama a Claude con los datos obtenidos y los que
 * faltan, revisa la respuesta (si vuelve a pedir un dato que ya está, si
 * pide más de dos, si sigue preguntando cuando ya toca cerrar o si tiene
 * una frase prohibida, como cifras de precio, o si escribe en el texto las
 * opciones que ya van como botones) y en ese caso la regenera UNA vez con la
 * corrección. Si ya tocaba cerrar y la regenerada sigue preguntando, cierra
 * igual. Después pone los botones o la lista según lo que la respuesta
 * pregunta y, si califica, usa uno de los cierres fijos. */

export type Turno =
  | { ok: false; motivo: Extract<ResultadoIA, { ok: false }>["motivo"]; usos: UsoLlamada[] }
  | { ok: true; respuesta: RespuestaBot; texto: string; interactivo: Interactivo | null; datos: DatosCalificacion; usos: UsoLlamada[]; regenerado: boolean };

export const CORRECCION_OPCIONES = "no escribas las opciones en el texto: ya van como botones o lista debajo del mensaje. Hacé la pregunta normal.";
export const CORRECCION_DERIVAR = "al derivar, decí que Luciano le va a escribir (sin prometer cuándo).";
export const CORRECCION_CIERRE = 'ya no hace falta preguntar más datos. Si el cliente no hizo ninguna pregunta, cerrá con accion "CALIFICADO"; si hizo una, contestala sin preguntar datos.';

/** Datos guardados + los que Claude extrajo en este turno (sin pisar los guardados). */
export function datosCombinados(guardados: DatosCalificacion, respuesta: RespuestaBot): DatosCalificacion {
  const datos: DatosCalificacion = { ...guardados };
  for (const c of CAMPOS_CALIFICACION) {
    const nuevo = respuesta.datosExtraidos[c]?.trim();
    if (!datos[c]?.trim() && nuevo) datos[c] = nuevo;
  }
  return datos;
}

/** ¿Ya toca cerrar y la respuesta sigue preguntando datos? */
function sigueCuandoTocaCerrar(respuesta: RespuestaBot, contexto: Contexto): boolean {
  const datos = datosCombinados(contexto.datos, respuesta);
  return respuesta.accion === "RESPONDER" && siguientePaso(datos, contexto.mensajesBot).tipo === "CERRAR" && camposPreguntados(respuesta.respuesta).length > 0;
}

/** Qué corregir de una respuesta; null si se puede mandar como está. */
export function correccionPara(respuesta: RespuestaBot, contexto: Contexto): string | null {
  if (!respuesta.esLead || (respuesta.accion !== "RESPONDER" && respuesta.accion !== "DERIVAR")) return null;
  const partes: string[] = [];
  const problema = problemaDeRespuesta(respuesta.respuesta, datosCombinados(contexto.datos, respuesta));
  if (problema) partes.push(textoCorreccion(problema));
  else if (sigueCuandoTocaCerrar(respuesta, contexto)) partes.push(CORRECCION_CIERRE);
  if (respuesta.accion === "DERIVAR" && !(/luciano/i.test(respuesta.respuesta) && /escrib|contact/i.test(respuesta.respuesta))) partes.push(CORRECCION_DERIVAR);
  const clave = respuesta.accion === "RESPONDER" ? opcionesPara(respuesta.respuesta, datosCombinados(contexto.datos, respuesta)) : null;
  if (clave && escribeLasOpciones(respuesta.respuesta, clave)) partes.push(CORRECCION_OPCIONES);
  const prohibidas = frasesProhibidas(respuesta.respuesta);
  if (prohibidas.length) partes.push(`tu respuesta anterior tenía ${prohibidas.join(" y ")}: sacalo.`);
  return partes.length ? partes.join(" ") : null;
}

export async function generarTurno(ia: MotorIA, historial: MensajeHistorial[], contexto: Contexto, semilla: string): Promise<Turno> {
  const usos: UsoLlamada[] = [];
  let r = await ia.responder(historial, contexto);
  if (r.uso) usos.push(r.uso);
  if (!r.ok) return { ok: false, motivo: r.motivo, usos };

  let regenerado = false;
  const correccion = correccionPara(r.respuesta, contexto);
  if (correccion) {
    regenerado = true;
    const segunda = await ia.responder(historial, { ...contexto, correccion });
    if (segunda.uso) usos.push(segunda.uso);
    // Si la segunda falla, sirve la primera: es mejor que derivar por un error.
    if (segunda.ok) r = segunda;
  }

  let respuesta = r.respuesta;
  const datos = datosCombinados(contexto.datos, respuesta);
  // Regla fija: si ya toca cerrar y aun regenerada sigue preguntando, se cierra igual.
  if (regenerado && sigueCuandoTocaCerrar(respuesta, contexto)) {
    console.info("[bot-whatsapp] Cierre forzado: ya no faltaban datos por preguntar");
    respuesta = { ...respuesta, accion: "CALIFICADO" };
  } else if (regenerado && correccionPara(respuesta, contexto)) {
    console.info("[bot-whatsapp] La respuesta regenerada todavía no cumple el control de datos: se manda igual");
  }
  if (respuesta.accion === "CALIFICADO") {
    return { ok: true, respuesta, texto: textoCierre(datos.nombre, semilla), interactivo: null, datos, usos, regenerado };
  }
  const texto = respuesta.respuesta.trim();
  const clave = respuesta.accion === "RESPONDER" ? opcionesPara(texto, datos) : null;
  return { ok: true, respuesta, texto, interactivo: clave ? OPCIONES[clave].interactivo : null, datos, usos, regenerado };
}
