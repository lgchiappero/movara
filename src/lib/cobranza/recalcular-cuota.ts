import { db } from "@/lib/db";
import { estadoCuota } from "@/lib/cobranza/calc";

/** Recalcula y persiste el estado de una cuota a partir de sus movimientos
 * actuales — se usa después de crear, editar o borrar un movimiento que
 * (puede) estar asociado a ella. Acepta la cuota ya resuelta para evitar
 * una consulta redundante cuando el caller ya la tiene en memoria. */
export async function recalcularEstadoCuota(
  cuotaId: string,
  cuotaPrefetched?: { importe: number; estado: string; vencimiento: Date | null }
): Promise<void> {
  const cuota = cuotaPrefetched ?? (await db.cuota.findUnique({ where: { id: cuotaId } }));
  if (!cuota) return;
  const movimientos = await db.movimiento.findMany({ where: { cuotaId }, select: { importe: true } });
  const totalPagado = movimientos.reduce((acc, m) => acc + m.importe, 0);
  const nuevoEstado = estadoCuota(cuota.importe, totalPagado, cuota.vencimiento, new Date());
  if (nuevoEstado !== cuota.estado) {
    await db.cuota.update({ where: { id: cuotaId }, data: { estado: nuevoEstado } });
  }
}
