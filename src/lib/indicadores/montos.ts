/** Montos separados por moneda: nunca se suman USD con ARS. */
export type MontosPorMoneda = Record<string, number>;

export function sumarMonto(montos: MontosPorMoneda, moneda: string, importe: number): void {
  montos[moneda] = (montos[moneda] ?? 0) + importe;
}

/** "USD 1.234 + ARS 50.000" — USD primero; las monedas en 0 no se muestran;
 * sin montos, "USD 0". */
export function formatMontos(montos: MontosPorMoneda, decimales = 2): string {
  const partes = Object.entries(montos)
    .filter(([, v]) => v > 0.005)
    .sort(([a], [b]) => (a === "USD" ? -1 : b === "USD" ? 1 : a.localeCompare(b)))
    .map(([moneda, v]) => `${moneda} ${v.toLocaleString("es-AR", { maximumFractionDigits: decimales })}`);
  return partes.length ? partes.join(" + ") : "USD 0";
}
