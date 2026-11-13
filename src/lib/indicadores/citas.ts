import type { Prisma } from "@prisma/client";
import { hoySoloFechaAR } from "@/lib/fecha-ar";

/** Citas del día (Argentina) que siguen en pie: sin las canceladas. Cita.fecha
 * es solo fecha (medianoche UTC). */
export function whereCitasDelDia(ahora: Date): Prisma.CitaWhereInput {
  return { fecha: hoySoloFechaAR(ahora), estado: { not: "cancelada" } };
}
