import { claveSoloFecha, esClaveFechaValida, soloFecha, sumarDias } from "@/lib/fecha-ar";

// Las fechas de agenda se guardan y comparan siempre a medianoche UTC
// (date-only) — "YYYY-MM-DD" es el único formato que entra/sale de estas
// funciones; la hora de reloj vive aparte, en el campo `horario`. "Hoy" es
// el de Argentina: hoyAR() de @/lib/fecha-ar. Estos nombres quedan como
// alias de fecha-ar para no tocar a todos los que los usan.

export function isFechaKeyValida(value: string): boolean {
  return esClaveFechaValida(value);
}

/** "YYYY-MM-DD" → Date a medianoche UTC. Asume `value` ya validado. */
export function fechaKeyToDate(value: string): Date {
  return soloFecha(value);
}

/** Fecha sin hora (medianoche UTC) → "YYYY-MM-DD", sin convertir de zona. */
export function dateToFechaKey(date: Date): string {
  return claveSoloFecha(date);
}

export function addDiasFechaKey(value: string, dias: number): string {
  return sumarDias(value, dias);
}
