import type { EstadoAcuerdo, EstadoCuota } from "@/lib/cobranza/constantes";

// Tolerancia para comparar sumas de floats (centavos) contra un total —
// evita falsos "parcial" por errores de redondeo binario.
const EPSILON = 0.01;

export function sumaImportes(movimientos: { importe: number }[]): number {
  return movimientos.reduce((acc, m) => acc + m.importe, 0);
}

/** Estado del acuerdo — se deriva en cada lectura, nunca se persiste.
 * Prioridad: saldado (ya se cobró/pagó todo) gana incluso si alguna cuota
 * quedó marcada "vencido" antes de completarse el pago. */
export function estadoAcuerdo(
  totalAcordado: number,
  totalMovimientos: number,
  cuotas: { estado: string }[]
): EstadoAcuerdo {
  if (totalMovimientos >= totalAcordado - EPSILON) return "saldado";
  if (cuotas.some((c) => c.estado === "vencido")) return "vencido";
  if (totalMovimientos > 0) return "parcial";
  return "pendiente";
}

/** Estado de una cuota puntual tras sumar sus movimientos — usado al
 * registrar un movimiento nuevo para recalcular esa cuota. */
export function estadoCuota(
  importeCuota: number,
  totalPagadoCuota: number,
  vencimiento: Date | null,
  hoy: Date
): EstadoCuota {
  if (totalPagadoCuota >= importeCuota - EPSILON) return "pagado";
  if (vencimiento && vencimiento.getTime() < hoy.getTime()) return "vencido";
  return "pendiente";
}

/** null cuando no hay nada cobrado — no tiene sentido expresar un margen
 * porcentual sobre una base de cero. */
export function margenPorcentaje(cobrado: number, pagado: number): number | null {
  if (cobrado <= 0) return null;
  return ((cobrado - pagado) / cobrado) * 100;
}
