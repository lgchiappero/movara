import { db } from "@/lib/db";
import { anioAR } from "@/lib/fecha-ar";

export async function ensureNumeroPedido(id: string): Promise<string> {
  return db.$transaction(async (tx) => {
    const config = await tx.configuracionPedido.findUniqueOrThrow({ where: { id } });
    if (config.numeroPedido) return config.numeroPedido;

    const anio = anioAR();
    const prefix = `MOV-${anio}-`;

    const existentes = await tx.configuracionPedido.findMany({
      where: { numeroPedido: { startsWith: prefix } },
      select: { numeroPedido: true },
    });

    const max = existentes.reduce((acc, c) => {
      const n = parseInt(c.numeroPedido!.slice(prefix.length), 10);
      return Number.isFinite(n) && n > acc ? n : acc;
    }, 0);

    const siguiente = `${prefix}${String(max + 1).padStart(3, "0")}`;

    await tx.configuracionPedido.update({
      where: { id },
      data: { numeroPedido: siguiente },
    });

    return siguiente;
  });
}
