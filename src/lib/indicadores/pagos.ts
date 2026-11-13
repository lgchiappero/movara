import { CONCEPTO_LABELS, CONCEPTO_LOGISTICA_LABELS, type ConceptoLogistica } from "@/lib/cobranza/constantes";
import { sumaImportes } from "@/lib/cobranza/calc";
import type { AcuerdoConDetalle } from "@/lib/cobranza/types";
import type { CostoLogisticaRow } from "@/lib/cobranza/logistica";
import { claveSoloFecha, esVencida, inicioMesSoloFechaAR } from "@/lib/fecha-ar";
import { cuotasReales, planTieneVencidas } from "./cuotas";
import { sumarMonto, type MontosPorMoneda } from "./montos";

// Pagos a proveedores: planes por unidad (fábrica, transporte, grúa…) y
// costos de logística internacional por envío. "Pagos vencidos" de
// /admin/pagos y la alerta del dashboard cuentan pagosVencidos(), y la lista
// filtrada muestra exactamente esas filas.

const EPSILON = 0.01;

/** Un costo de logística está vencido si sigue pendiente y su fecha
 * prevista (solo fecha) ya pasó en Argentina. */
export function costoLogisticaVencido(costo: { estado: string; fecha: string | Date }, ahora: Date): boolean {
  return costo.estado === "pendiente" && esVencida(costo.fecha, ahora);
}

/** Un plan de pago está vencido si tiene alguna cuota vencida con saldo. */
export function planPagoVencido(plan: AcuerdoConDetalle, ahora: Date): boolean {
  return planTieneVencidas(plan, ahora);
}

export type PagoVencido = {
  key: string;
  origen: "plan" | "logistica";
  /** "Fábrica", "Transporte", "Logística: Flete", "Logística: Despachante"… */
  tipo: string;
  /** Unidad (planes) o envío (logística). */
  referencia: string;
  contraparte: string;
  /** Vencimiento más viejo con saldo (planes) o fecha prevista (logística), "YYYY-MM-DD". */
  vencimiento: string;
  moneda: string;
  /** Lo vencido que falta pagar. */
  saldo: number;
  href: string;
};

export function pagosVencidos(planes: AcuerdoConDetalle[], costos: CostoLogisticaRow[], ahora: Date): PagoVencido[] {
  const filas: PagoVencido[] = [];
  for (const plan of planes) {
    if (plan.tipo !== "pago") continue;
    const vencidas = cuotasReales(plan, ahora)
      .map((c, i) => ({ c, venc: plan.cuotas[i].vencimiento }))
      .filter(({ c }) => c.vencida);
    if (!vencidas.length) continue;
    filas.push({
      key: `plan|${plan.id}`,
      origen: "plan",
      tipo: CONCEPTO_LABELS[plan.concepto as keyof typeof CONCEPTO_LABELS] ?? plan.concepto,
      referencia: plan.unidadNumero ?? "Unidad sin número",
      contraparte: plan.contraparte,
      vencimiento: vencidas.map(({ venc }) => claveSoloFecha(venc!)).sort()[0],
      moneda: plan.moneda,
      saldo: vencidas.reduce((acc, { c }) => acc + c.restante, 0),
      href: `/admin/unidades/${plan.unidadId}`,
    });
  }
  for (const costo of costos) {
    if (!costoLogisticaVencido(costo, ahora)) continue;
    filas.push({
      key: `logistica|${costo.id}`,
      origen: "logistica",
      tipo: `Logística: ${CONCEPTO_LOGISTICA_LABELS[costo.concepto as ConceptoLogistica] ?? costo.concepto}`,
      referencia: costo.envioNumeroPI ? `Envío ${costo.envioNumeroPI}` : "Envío sin PI",
      contraparte: costo.descripcion ?? "",
      vencimiento: claveSoloFecha(costo.fecha),
      moneda: costo.moneda,
      saldo: costo.importe,
      href: `/admin/envios/${costo.envioId}`,
    });
  }
  return filas.sort((a, b) => a.vencimiento.localeCompare(b.vencimiento) || a.key.localeCompare(b.key));
}

export function totalPorMoneda(filas: { moneda: string; saldo: number }[]): MontosPorMoneda {
  const total: MontosPorMoneda = {};
  for (const f of filas) sumarMonto(total, f.moneda, f.saldo);
  return total;
}

/** Tarjetas "Pagado este mes" y "Por pagar" — las mismas en /admin/pagos y
 * en el dashboard: planes de pago por unidad + costos de logística, cada
 * moneda por separado. "Este mes" = mes calendario argentino, comparado
 * contra la fecha (sin hora) de cada pago. */
export function metricasPagos(
  planes: AcuerdoConDetalle[],
  costos: CostoLogisticaRow[],
  ahora: Date
): { pagadoMes: MontosPorMoneda; porPagar: MontosPorMoneda } {
  const desde = claveSoloFecha(inicioMesSoloFechaAR(ahora));
  const hasta = claveSoloFecha(inicioMesSoloFechaAR(ahora, 1));
  const enMes = (fecha: string) => {
    const dia = claveSoloFecha(fecha);
    return dia >= desde && dia < hasta;
  };
  const pagadoMes: MontosPorMoneda = { USD: 0, ARS: 0 };
  const porPagar: MontosPorMoneda = { USD: 0, ARS: 0 };
  for (const p of planes) {
    if (p.tipo !== "pago") continue;
    sumarMonto(pagadoMes, p.moneda, sumaImportes(p.movimientos.filter((m) => enMes(m.fecha))));
    const saldo = p.totalAcordado - sumaImportes(p.movimientos);
    if (saldo > EPSILON) sumarMonto(porPagar, p.moneda, saldo);
  }
  for (const c of costos) {
    if (c.estado === "pagado") {
      if (enMes(c.fecha)) sumarMonto(pagadoMes, c.moneda, c.importe);
    } else {
      sumarMonto(porPagar, c.moneda, c.importe);
    }
  }
  return { pagadoMes, porPagar };
}
