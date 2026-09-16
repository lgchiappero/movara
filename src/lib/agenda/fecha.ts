// Las fechas de agenda se guardan y comparan siempre a medianoche UTC
// (date-only) — mismo criterio que ConfiguracionPedido.garantiaFechaInicio,
// para evitar el off-by-one-day que da comparar con la hora local del
// server. "YYYY-MM-DD" es el único formato que entra/sale de estas
// funciones; la hora de reloj vive aparte, en el campo `horario`.

const FECHA_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export function isFechaKeyValida(value: string): boolean {
  if (!FECHA_REGEX.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return (
    date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d
  );
}

/** "YYYY-MM-DD" → Date a medianoche UTC. Asume `value` ya validado. */
export function fechaKeyToDate(value: string): Date {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/** Date (en cualquier hora) → "YYYY-MM-DD" tomando los componentes UTC. */
export function dateToFechaKey(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Medianoche UTC de "hoy" — para no agendar/mostrar días ya pasados. */
export function hoyFechaKey(): string {
  return dateToFechaKey(new Date());
}

export function addDiasFechaKey(value: string, dias: number): string {
  const date = fechaKeyToDate(value);
  date.setUTCDate(date.getUTCDate() + dias);
  return dateToFechaKey(date);
}
