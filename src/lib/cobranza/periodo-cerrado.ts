import { db } from "@/lib/db";
import { claveSoloFecha } from "@/lib/fecha-ar";

/** True si el mes calendario de `fecha` (un día sin hora, guardado a
 * medianoche UTC: se toma su fecha tal cual) ya tiene un CierrePeriodo — usado
 * en los 3 lugares donde se escriben movimientos (crear, editar, borrar)
 * para que la inmutabilidad de un período cerrado no dependa de la UI. */
export async function periodoEstaCerrado(fecha: Date): Promise<boolean> {
  const [anio, mes] = claveSoloFecha(fecha).split("-").map(Number);
  const cierre = await db.cierrePeriodo.findUnique({ where: { mes_anio: { mes, anio } } });
  return cierre !== null;
}
