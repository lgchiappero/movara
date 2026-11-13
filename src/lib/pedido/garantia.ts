export const GARANTIA_MESES = 12;
import { claveSoloFecha, soloFecha, sumarMeses } from "@/lib/fecha-ar";

/** Garantía MOVARA: 12 meses desde la fecha de inicio. Se recalcula cada vez
 * que garantiaFechaInicio cambia — nunca se edita a mano. */
export function calcularGarantiaFechaFin(fechaInicio: Date | null): Date | null {
  if (!fechaInicio) return null;
  // Solo fecha (medianoche UTC): se suman meses sobre la fecha calendario,
  // sin depender de la zona de la máquina (31/1 + 1 mes = 28 o 29/2).
  return soloFecha(sumarMeses(claveSoloFecha(fechaInicio), GARANTIA_MESES));
}
