import { db } from "@/lib/db";

/** Fecha del primer movimiento de cobro de cada unidad, en una sola query
 * batcheada — usado por las grillas de unidades (/admin/unidades y el
 * dashboard) para calcular su "Próximo paso" sin una consulta por fila. */
export async function primerCobroPorUnidad(unidadIds: string[]): Promise<Map<string, Date>> {
  if (unidadIds.length === 0) return new Map();

  const movimientos = await db.movimiento.findMany({
    where: { acuerdo: { tipo: "cobro", unidadId: { in: unidadIds } } },
    select: { fecha: true, acuerdo: { select: { unidadId: true } } },
    orderBy: { fecha: "asc" },
  });

  const mapa = new Map<string, Date>();
  for (const m of movimientos) {
    if (!mapa.has(m.acuerdo.unidadId)) mapa.set(m.acuerdo.unidadId, m.fecha);
  }
  return mapa;
}
