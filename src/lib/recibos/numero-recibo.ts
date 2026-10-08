import type { Prisma } from "@prisma/client";

/** REC-{AÑO}-{NRO 3 dígitos}. Mismo patrón que generateNumeroUnidad: se
 * genera dentro de la misma transacción que el create(). Cuenta también los
 * anulados — un número no se reutiliza nunca. */
export async function generateNumeroRecibo(tx: Prisma.TransactionClient, ahora: Date = new Date()): Promise<string> {
  const prefix = `REC-${ahora.getFullYear()}-`;
  const existentes = await tx.reciboConformidad.findMany({
    where: { numeroRecibo: { startsWith: prefix } },
    select: { numeroRecibo: true },
  });
  const max = existentes.reduce((acc, r) => {
    const n = parseInt(r.numeroRecibo.slice(prefix.length), 10);
    return Number.isFinite(n) && n > acc ? n : acc;
  }, 0);
  return `${prefix}${String(max + 1).padStart(3, "0")}`;
}
