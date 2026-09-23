import type { Prisma } from "@prisma/client";

/** Mismo patrón que generateNumeroConsulta (numero-consulta.ts) — se genera
 * dentro de la misma transacción que el create() de la unidad. */
export async function generateNumeroUnidad(tx: Prisma.TransactionClient): Promise<string> {
  const anio = new Date().getFullYear();
  const prefix = `MOV-UNIDAD-${anio}-`;

  const existentes = await tx.unidad.findMany({
    where: { numeroUnidad: { startsWith: prefix } },
    select: { numeroUnidad: true },
  });

  const max = existentes.reduce((acc, u) => {
    const n = parseInt(u.numeroUnidad!.slice(prefix.length), 10);
    return Number.isFinite(n) && n > acc ? n : acc;
  }, 0);

  return `${prefix}${String(max + 1).padStart(3, "0")}`;
}
