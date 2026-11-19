import { z } from "zod";
import { ORIGENES } from "./constantes";

/** Salida estructurada que Claude devuelve en cada turno. La API la genera
 * contra este esquema (output_config.format) y el SDK la valida otra vez con
 * Zod: si no valida, el bot deriva a Luciano y NO responde. */

export const ACCIONES = ["RESPONDER", "CALIFICADO", "DERIVAR", "NO_RESPONDER"] as const;
export type Accion = (typeof ACCIONES)[number];

const dato = z.string().max(200).nullable();

export const respuestaBotSchema = z.object({
  /** ¿Quien escribe es un posible cliente de MOVARA? */
  esLead: z.boolean(),
  /** Texto a mandar por WhatsApp (vacío si la acción es NO_RESPONDER). */
  respuesta: z.string().max(1000),
  /** Datos que el cliente dio en la conversación; null si no los dio. */
  datosExtraidos: z.object({
    nombre: dato,
    uso: dato,
    zona: dato,
    terreno: dato,
    personas: dato,
    plazo: dato,
    origen: z.enum(ORIGENES).nullable(),
    origenDetalle: dato,
  }),
  accion: z.enum(ACCIONES),
  /** Por qué eligió la acción (para el equipo; nunca se le manda al cliente). */
  motivo: z.string().max(300),
});

export type RespuestaBot = z.infer<typeof respuestaBotSchema>;
export type DatosExtraidos = RespuestaBot["datosExtraidos"];

/** Una respuesta que el bot puede mandar: con texto si la acción lo pide. */
export function respuestaUtilizable(r: RespuestaBot): boolean {
  if (r.accion === "NO_RESPONDER") return true;
  return r.respuesta.trim().length > 0;
}
