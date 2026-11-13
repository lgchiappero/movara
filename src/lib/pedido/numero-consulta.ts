import type { Prisma } from "@prisma/client";
import { anioAR } from "@/lib/fecha-ar";

/**
 * A diferencia de numeroPedido (generado después, al confirmar), numeroConsulta
 * se necesita antes de que la fila exista — se genera dentro de la misma
 * transacción que el create().
 */
export async function generateNumeroConsulta(tx: Prisma.TransactionClient): Promise<string> {
  const anio = anioAR();
  const prefix = `MOV-CONSULTA-${anio}-`;

  const existentes = await tx.configuracionPedido.findMany({
    where: { numeroConsulta: { startsWith: prefix } },
    select: { numeroConsulta: true },
  });

  const max = existentes.reduce((acc, c) => {
    const n = parseInt(c.numeroConsulta!.slice(prefix.length), 10);
    return Number.isFinite(n) && n > acc ? n : acc;
  }, 0);

  return `${prefix}${String(max + 1).padStart(3, "0")}`;
}
