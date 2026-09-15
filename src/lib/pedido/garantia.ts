export const GARANTIA_MESES = 12;

/** Garantía MOVARA: 12 meses desde la fecha de inicio. Se recalcula cada vez
 * que garantiaFechaInicio cambia — nunca se edita a mano. */
export function calcularGarantiaFechaFin(fechaInicio: Date | null): Date | null {
  if (!fechaInicio) return null;
  const fin = new Date(fechaInicio);
  fin.setMonth(fin.getMonth() + GARANTIA_MESES);
  return fin;
}
