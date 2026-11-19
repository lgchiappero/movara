import { db } from "@/lib/db";
import { AVISO_GASTO } from "./constantes";
import { calcularGasto, mesActual } from "./config";

/** Precios en USD por millón de tokens de claude-haiku-5-5 (prompts de hasta
 * 100K tokens; los del bot son de pocos miles). Editables si cambian. */
export const PRECIOS_MODELO = {
  entrada: 0.1,
  salida: 0.5,
  escrituraCache: 0.125, // 1,25 × entrada (caché de 5 minutos)
  lecturaCache: 0.01, // 0,1 × entrada
} as const;

export type UsoLlamada = {
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens?: number | null;
  cache_read_input_tokens?: number | null;
};

/** Costo en USD de una llamada (input_tokens NO incluye los de caché). */
export function costoDeLlamada(uso: UsoLlamada, precios = PRECIOS_MODELO): number {
  const millon = 1_000_000;
  return (
    (uso.input_tokens * precios.entrada +
      uso.output_tokens * precios.salida +
      (uso.cache_creation_input_tokens ?? 0) * precios.escrituraCache +
      (uso.cache_read_input_tokens ?? 0) * precios.lecturaCache) /
    millon
  );
}

/** Suma la llamada al uso del mes. Devuelve true si este registro cruzó el
 * 80 % del tope por primera vez en el mes (el aviso sale una sola vez: se
 * marca con un update condicional, así dos llamadas a la vez no lo duplican). */
export async function registrarUso(uso: UsoLlamada, topeUsd: number, ahora: Date = new Date()): Promise<{ costoUsd: number; avisarOchenta: boolean }> {
  const mes = mesActual(ahora);
  const costo = costoDeLlamada(uso);
  const entrada = uso.input_tokens + (uso.cache_creation_input_tokens ?? 0) + (uso.cache_read_input_tokens ?? 0);
  const fila = await db.usoBot.upsert({
    where: { mes },
    create: { mes, tokensEntrada: entrada, tokensSalida: uso.output_tokens, costoUsd: costo, llamadas: 1 },
    update: {
      tokensEntrada: { increment: entrada },
      tokensSalida: { increment: uso.output_tokens },
      costoUsd: { increment: costo },
      llamadas: { increment: 1 },
    },
  });
  let avisarOchenta = false;
  if (calcularGasto(mes, fila.costoUsd, topeUsd).porcentaje >= AVISO_GASTO && !fila.avisoOchentaEn) {
    const marcado = await db.usoBot.updateMany({ where: { mes, avisoOchentaEn: null }, data: { avisoOchentaEn: ahora } });
    avisarOchenta = marcado.count === 1;
  }
  return { costoUsd: fila.costoUsd, avisarOchenta };
}
