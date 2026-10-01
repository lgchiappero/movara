import { db } from "@/lib/db";

/** Resumen de cobranza de una unidad, calculado desde sus movimientos reales
 * (movimientos → acuerdos_pago → unidad). Lo usan la línea de tiempo y las
 * grillas de unidades (/admin/unidades y el dashboard). */
export type ResumenCobranzaUnidad = {
  /** Fecha del primer movimiento de cobro (cualquier moneda) — null si no hay. */
  primerCobroFecha: Date | null;
  /** Fecha del último movimiento de cobro (cualquier moneda) — null si no hay. */
  ultimoCobroFecha: Date | null;
  /** Suma de los movimientos de cobro de acuerdos en USD. Los cobros en ARS
   * no se convierten (mismo criterio que Rentabilidad y los KPIs de cobranza). */
  cobradoUSD: number;
  /** Fecha del primer movimiento de pago a fábrica — null si no hay. */
  primerPagoFabricaFecha: Date | null;
};

export const RESUMEN_COBRANZA_VACIO: ResumenCobranzaUnidad = {
  primerCobroFecha: null,
  ultimoCobroFecha: null,
  cobradoUSD: 0,
  primerPagoFabricaFecha: null,
};

export type MovimientoParaResumen = {
  fecha: Date;
  importe: number;
  acuerdo: { unidadId: string; tipo: string; moneda: string; concepto: string };
};

export function resumirMovimientos(movimientos: MovimientoParaResumen[]): Map<string, ResumenCobranzaUnidad> {
  const mapa = new Map<string, ResumenCobranzaUnidad>();
  for (const m of movimientos) {
    const r = mapa.get(m.acuerdo.unidadId) ?? { ...RESUMEN_COBRANZA_VACIO };
    if (m.acuerdo.tipo === "cobro") {
      if (!r.primerCobroFecha || m.fecha < r.primerCobroFecha) r.primerCobroFecha = m.fecha;
      if (!r.ultimoCobroFecha || m.fecha > r.ultimoCobroFecha) r.ultimoCobroFecha = m.fecha;
      if (m.acuerdo.moneda === "USD") r.cobradoUSD += m.importe;
    } else if (m.acuerdo.tipo === "pago" && m.acuerdo.concepto === "fabrica") {
      if (!r.primerPagoFabricaFecha || m.fecha < r.primerPagoFabricaFecha) r.primerPagoFabricaFecha = m.fecha;
    }
    mapa.set(m.acuerdo.unidadId, r);
  }
  return mapa;
}

/** Resumen de cobranza de varias unidades en una sola query batcheada — sin
 * una consulta por fila. Las unidades sin movimientos no aparecen en el
 * mapa (usar RESUMEN_COBRANZA_VACIO como default). */
export async function resumenCobranzaPorUnidad(unidadIds: string[]): Promise<Map<string, ResumenCobranzaUnidad>> {
  if (unidadIds.length === 0) return new Map();

  const movimientos = await db.movimiento.findMany({
    where: {
      acuerdo: {
        unidadId: { in: unidadIds },
        OR: [{ tipo: "cobro" }, { tipo: "pago", concepto: "fabrica" }],
      },
    },
    select: {
      fecha: true,
      importe: true,
      acuerdo: { select: { unidadId: true, tipo: true, moneda: true, concepto: true } },
    },
  });
  return resumirMovimientos(movimientos);
}
