/** Tasa de conversión = ganados / total, como fracción 0–1. `total` incluye
 * todas las etapas (ganados, perdidos y los que siguen activos) — null si
 * todavía no hay ningún lead en el período (evita dividir por cero). */
export function tasaConversion(ganados: number, total: number): number | null {
  if (total <= 0) return null;
  return ganados / total;
}
