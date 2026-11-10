import type { Prisma } from "@prisma/client";
import { imputarCuotas } from "@/lib/cobranza/imputacion";

/** Recalcula y persiste el estado de TODAS las cuotas de un plan a partir
 * de sus movimientos actuales (ver imputacion.ts). Se llama dentro de la
 * misma transacción que crea, edita o borra un movimiento, o que edita las
 * cuotas del plan: un pago "sin cuota específica" también salda cuotas, así
 * que no alcanza con recalcular la cuota elegida.
 *
 * El estado del plan (pendiente/parcial/saldado/vencido) no se persiste: se
 * deriva en cada lectura de los movimientos y de estas cuotas (calc.ts). */
export async function recalcularEstadosPlan(
  tx: Prisma.TransactionClient,
  acuerdoId: string,
  ahora: Date = new Date()
): Promise<void> {
  const [cuotas, movimientos] = await Promise.all([
    tx.cuota.findMany({
      where: { acuerdoId },
      select: { id: true, importe: true, vencimiento: true, createdAt: true, estado: true },
    }),
    tx.movimiento.findMany({ where: { acuerdoId }, select: { cuotaId: true, importe: true } }),
  ]);
  const actual = new Map(cuotas.map((c) => [c.id, c.estado]));
  for (const c of imputarCuotas(cuotas, movimientos, ahora)) {
    if (actual.get(c.id) !== c.estado) {
      await tx.cuota.update({ where: { id: c.id }, data: { estado: c.estado } });
    }
  }
}
