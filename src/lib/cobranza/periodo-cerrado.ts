import { db } from "@/lib/db";

/** True si el mes calendario de `fecha` ya tiene un CierrePeriodo — usado
 * en los 3 lugares donde se escriben movimientos (crear, editar, borrar)
 * para que la inmutabilidad de un período cerrado no dependa de la UI. */
export async function periodoEstaCerrado(fecha: Date): Promise<boolean> {
  const cierre = await db.cierrePeriodo.findUnique({
    where: { mes_anio: { mes: fecha.getMonth() + 1, anio: fecha.getFullYear() } },
  });
  return cierre !== null;
}
