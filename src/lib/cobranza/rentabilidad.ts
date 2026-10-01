import { margenPorcentaje } from "@/lib/cobranza/calc";
import { categoriaCosto } from "@/lib/cobranza/pagos-unidad";
import type { AcuerdoConDetalle } from "@/lib/cobranza/types";

/** Parte de un costo de logística internacional (pagado, en USD) que le
 * tocó a una unidad por prorrateo. */
export type ProrrateoUSD = {
  unidadId: string;
  unidadNumero: string | null;
  unidadModelo: string | null;
  unidadEstado: string;
  clienteNombre: string;
  importe: number;
  /** ISO — fecha de pago del costo. */
  fecha: string;
};

export type RentabilidadUnidad = {
  unidadId: string;
  unidadNumero: string | null;
  unidadModelo: string | null;
  unidadEstado: string;
  clienteNombre: string;
  cobrado: number;
  fabrica: number;
  logisticaNacional: number;
  logisticaInternacional: number;
  /** cobrado − fábrica − logística nacional − logística internacional */
  margenUSD: number;
  margenPct: number | null;
};

/** Margen real por unidad, en USD y por caja dentro del período:
 * cobrado al cliente − pagos a fábrica − logística nacional − la parte de
 * logística internacional (si el costo del envío está prorrateado). Solo
 * USD — sin conversión de ARS, igual que el resto de cobranza. */
export function rentabilidadPorUnidad(
  acuerdosCobro: AcuerdoConDetalle[],
  acuerdosPago: AcuerdoConDetalle[],
  prorrateos: ProrrateoUSD[],
  periodo: { desde: string; hasta: string }
): RentabilidadUnidad[] {
  // Las fechas de pago son días (medianoche UTC) y el período arranca a
  // medianoche del servidor: comparar instantes corría los pagos del día 1
  // al mes anterior en Argentina. Se compara por día "YYYY-MM-DD".
  const desde = periodo.desde.slice(0, 10);
  const hasta = periodo.hasta.slice(0, 10);
  const enPeriodo = (fecha: string) => {
    const dia = fecha.slice(0, 10);
    return dia >= desde && dia < hasta;
  };

  const mapa = new Map<string, Omit<RentabilidadUnidad, "margenUSD" | "margenPct">>();
  function entrada(u: { unidadId: string; unidadNumero: string | null; unidadModelo: string | null; unidadEstado: string; clienteNombre: string }) {
    let e = mapa.get(u.unidadId);
    if (!e) {
      e = {
        unidadId: u.unidadId,
        unidadNumero: u.unidadNumero,
        unidadModelo: u.unidadModelo,
        unidadEstado: u.unidadEstado,
        clienteNombre: u.clienteNombre,
        cobrado: 0,
        fabrica: 0,
        logisticaNacional: 0,
        logisticaInternacional: 0,
      };
      mapa.set(u.unidadId, e);
    }
    return e;
  }
  const movidoEnPeriodo = (a: AcuerdoConDetalle) =>
    a.movimientos.filter((m) => enPeriodo(m.fecha)).reduce((acc, m) => acc + m.importe, 0);

  for (const a of acuerdosCobro) {
    if (a.moneda !== "USD") continue;
    entrada(a).cobrado += movidoEnPeriodo(a);
  }
  for (const a of acuerdosPago) {
    if (a.moneda !== "USD") continue;
    const e = entrada(a);
    const monto = movidoEnPeriodo(a);
    const categoria = categoriaCosto(a.concepto);
    if (categoria === "fabrica") e.fabrica += monto;
    else if (categoria === "nacional") e.logisticaNacional += monto;
    else e.logisticaInternacional += monto;
  }
  for (const p of prorrateos) {
    if (!enPeriodo(p.fecha)) continue;
    entrada(p).logisticaInternacional += p.importe;
  }

  return [...mapa.values()].map((e) => {
    const costos = e.fabrica + e.logisticaNacional + e.logisticaInternacional;
    return { ...e, margenUSD: e.cobrado - costos, margenPct: margenPorcentaje(e.cobrado, costos) };
  });
}
