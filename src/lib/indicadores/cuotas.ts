import { imputarCuotas, type CuotaImputada, type CuotaParaImputar, type MovimientoParaImputar } from "@/lib/cobranza/imputacion";
import { claveSoloFecha, hoyAR, sumarDias } from "@/lib/fecha-ar";

// Cuotas de un plan (cobro o pago) según su saldo real: lo que falta pagar
// de cada una con los pagos imputados (cobranza/imputacion.ts), no el campo
// Cuota.estado. Los contadores y las listas usan estas mismas funciones.

export type PlanConCuotas = {
  cuotas: (CuotaParaImputar & { estado?: string })[];
  movimientos: MovimientoParaImputar[];
};

export function cuotasReales(plan: PlanConCuotas, ahora: Date): CuotaImputada[] {
  return imputarCuotas(plan.cuotas, plan.movimientos, ahora);
}

/** Alguna cuota vencida (desde el día siguiente a su vencimiento, en hora
 * argentina) con saldo. */
export function planTieneVencidas(plan: PlanConCuotas, ahora: Date): boolean {
  return cuotasReales(plan, ahora).some((c) => c.vencida);
}

/** Lo que falta pagar de las cuotas vencidas. */
export function saldoVencidoPlan(plan: PlanConCuotas, ahora: Date): number {
  return cuotasReales(plan, ahora).reduce((acc, c) => acc + (c.vencida ? c.restante : 0), 0);
}

/** Cuotas con saldo que vencen en los próximos 7 días: [hoy, hoy + 7) en
 * Argentina. Las ya vencidas no (cuentan como vencidas). */
export function cuotasQueVencenEnLaSemana(plan: PlanConCuotas, ahora: Date): CuotaImputada[] {
  const hoy = hoyAR(ahora);
  const hasta = sumarDias(hoy, 7);
  const reales = cuotasReales(plan, ahora);
  return plan.cuotas.flatMap((cuota, i) => {
    const c = reales[i];
    if (c.restante === 0 || c.vencida || cuota.vencimiento === null) return [];
    const dia = claveSoloFecha(cuota.vencimiento);
    return dia >= hoy && dia < hasta ? [c] : [];
  });
}

export function planVenceEnLaSemana(plan: PlanConCuotas, ahora: Date): boolean {
  return cuotasQueVencenEnLaSemana(plan, ahora).length > 0;
}
