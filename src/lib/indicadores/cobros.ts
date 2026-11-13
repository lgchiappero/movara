import { fechaEnRango, type FilaPlanUnidad } from "@/lib/cobranza/planes-unidad";
import type { AcuerdoConDetalle } from "@/lib/cobranza/types";
import { cuotasQueVencenEnLaSemana, saldoVencidoPlan } from "./cuotas";
import { sumarMonto, type MontosPorMoneda } from "./montos";

// Cobros a clientes, sobre las filas por unidad de /admin/cobranza
// (filasPorUnidad). Los contadores del dashboard y de Cobranza cuentan
// UNIDADES con estas funciones, y la grilla filtrada (?estado=vencidas /
// ?vence=semana) muestra esas mismas filas: f.tieneVencidas / f.venceEstaSemana.

/** Lo cobrado (o pagado) en [desde, hasta), por moneda — contra la fecha
 * (sin hora) de cada pago. */
export function cobradoEnRango(planes: AcuerdoConDetalle[], rango: { desde: Date; hasta: Date }): MontosPorMoneda {
  const montos: MontosPorMoneda = { USD: 0, ARS: 0 };
  for (const p of planes) {
    for (const m of p.movimientos) if (fechaEnRango(m.fecha, rango)) sumarMonto(montos, p.moneda, m.importe);
  }
  return montos;
}

/** Unidades con cuotas de cobro vencidas con saldo real, y ese saldo. */
export function cobrosVencidos(filas: FilaPlanUnidad[], ahora: Date): { filas: FilaPlanUnidad[]; saldo: MontosPorMoneda } {
  const conVencidas = filas.filter((f) => f.tieneVencidas);
  const saldo: MontosPorMoneda = {};
  for (const f of conVencidas) for (const p of f.planes) sumarMonto(saldo, p.moneda, saldoVencidoPlan(p, ahora));
  return { filas: conVencidas, saldo };
}

/** Unidades con cuotas de cobro con saldo que vencen en los próximos 7 días. */
export function cobrosQueVencenEnLaSemana(
  filas: FilaPlanUnidad[],
  ahora: Date
): { filas: FilaPlanUnidad[]; saldo: MontosPorMoneda } {
  const conSemana = filas.filter((f) => f.venceEstaSemana);
  const saldo: MontosPorMoneda = {};
  for (const f of conSemana) {
    for (const p of f.planes) {
      for (const c of cuotasQueVencenEnLaSemana(p, ahora)) sumarMonto(saldo, p.moneda, c.restante);
    }
  }
  return { filas: conSemana, saldo };
}
