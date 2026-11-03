import { db } from "@/lib/db";
import type { ConfiguracionPedido } from "@prisma/client";

// Lectura de un pedido que no rompe si a la base le falta una columna que el
// código ya espera (una migración sin aplicar en producción, como pasó con
// desgloseEstimado el 3/11/2026: el detalle del admin daba "Minified React
// error #441" para todos los pedidos). Prisma lee todas las columnas del
// modelo y falla entero con P2022; acá se reintenta sin esa columna y se
// avisa cuáles quedaron sin dato, para mostrar el resto del pedido.

/** Cuántas columnas faltantes se toleran antes de rendirse. */
const MAX_COLUMNAS_FALTANTES = 5;

export type PedidoTolerante = {
  pedido: ConfiguracionPedido;
  /** Campos que no se pudieron leer (la base no tiene la columna): vienen en null. */
  camposNoDisponibles: string[];
};

type ErrorPrisma = { code?: unknown; meta?: { column?: unknown } | null; message?: unknown };

/** Si el error es "falta la columna X" (P2022), devuelve X; si no, null. */
export function columnaFaltante(err: unknown): string | null {
  const e = (err ?? {}) as ErrorPrisma;
  if (e.code !== "P2022") return null;
  // meta.column: "tabla.columna" o "columna". Si no viene (Prisma 7 con driver
  // adapter), el mensaje: "The column `tabla.columna` does not exist ...".
  if (typeof e.meta?.column === "string") return e.meta.column.split(".").pop() || null;
  const m = /column `(?:[^`.]+\.)?([^`.]+)` does not exist/.exec(typeof e.message === "string" ? e.message : "");
  return m ? m[1] : null;
}

export async function buscarPedidoTolerante(id: string): Promise<PedidoTolerante | null> {
  const camposNoDisponibles: string[] = [];
  for (;;) {
    try {
      const omit = Object.fromEntries(camposNoDisponibles.map((c) => [c, true]));
      const pedido = await db.configuracionPedido.findUnique({
        where: { id },
        ...(camposNoDisponibles.length ? { omit } : {}),
      });
      if (!pedido) return null;
      for (const c of camposNoDisponibles) (pedido as Record<string, unknown>)[c] = null;
      return { pedido, camposNoDisponibles };
    } catch (err) {
      const columna = columnaFaltante(err);
      if (!columna || camposNoDisponibles.includes(columna) || camposNoDisponibles.length >= MAX_COLUMNAS_FALTANTES) throw err;
      console.error(`[pedido ${id}] Falta la columna ${columna} en la base: se muestra el pedido sin ese dato. Revisar migraciones.`);
      camposNoDisponibles.push(columna);
    }
  }
}
