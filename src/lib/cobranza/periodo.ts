export const PERIODO_TIPO_OPTIONS = ["mes_actual", "mes_anterior", "trimestre", "anio", "personalizado"] as const;
export type PeriodoTipo = (typeof PERIODO_TIPO_OPTIONS)[number];

export const PERIODO_TIPO_LABELS: Record<PeriodoTipo, string> = {
  mes_actual: "Este mes",
  mes_anterior: "Mes anterior",
  trimestre: "Este trimestre",
  anio: "Este año",
  personalizado: "Rango personalizado",
};

export type RangoPeriodo = { desde: Date; hasta: Date };

function startOfMonth(anio: number, mesIdx0: number): Date {
  return new Date(anio, mesIdx0, 1);
}

/** [desde, hasta) — `hasta` es siempre un límite exclusivo, listo para usar
 * en un filtro Prisma `{ lt: hasta }`. */
export function calcularRangoPeriodo(
  tipo: PeriodoTipo,
  now: Date,
  desdeParam?: string | null,
  hastaParam?: string | null
): RangoPeriodo {
  const anio = now.getFullYear();
  const mes = now.getMonth();

  if (tipo === "mes_anterior") {
    return { desde: startOfMonth(anio, mes - 1), hasta: startOfMonth(anio, mes) };
  }
  if (tipo === "trimestre") {
    const inicioTrimestre = Math.floor(mes / 3) * 3;
    return { desde: startOfMonth(anio, inicioTrimestre), hasta: startOfMonth(anio, inicioTrimestre + 3) };
  }
  if (tipo === "anio") {
    return { desde: new Date(anio, 0, 1), hasta: new Date(anio + 1, 0, 1) };
  }
  if (tipo === "personalizado" && desdeParam && hastaParam) {
    const desde = new Date(desdeParam);
    const hasta = new Date(hastaParam);
    if (!Number.isNaN(desde.getTime()) && !Number.isNaN(hasta.getTime())) {
      // `hasta` llega como fecha (sin hora) del date picker — se interpreta
      // inclusiva, así que el límite exclusivo real es el día siguiente.
      const hastaExclusiva = new Date(hasta);
      hastaExclusiva.setDate(hastaExclusiva.getDate() + 1);
      return { desde, hasta: hastaExclusiva };
    }
  }
  // default / "mes_actual"
  return { desde: startOfMonth(anio, mes), hasta: startOfMonth(anio, mes + 1) };
}

/** Si el rango calculado coincide exactamente con un único mes calendario,
 * devuelve ese {mes, anio} (1-12) — usado para el badge/botón de cierre,
 * que solo tiene sentido para un mes puntual, no para un trimestre/año/
 * rango arbitrario. */
export function mesAnioUnico(rango: RangoPeriodo): { mes: number; anio: number } | null {
  const { desde, hasta } = rango;
  const esInicioDeMes = desde.getDate() === 1 && desde.getHours() === 0 && desde.getMinutes() === 0;
  if (!esInicioDeMes) return null;
  const mesSiguiente = new Date(desde.getFullYear(), desde.getMonth() + 1, 1);
  if (mesSiguiente.getTime() !== hasta.getTime()) return null;
  return { mes: desde.getMonth() + 1, anio: desde.getFullYear() };
}

/** Cuenta los meses calendario, desde el mes del primer movimiento hasta
 * el mes anterior al actual (el mes actual nunca cuenta: todavía no
 * terminó, no se puede cerrar), que no tienen un cierre registrado. Sin
 * movimientos todavía, no hay nada que cerrar. */
export function contarPeriodosSinCerrar(
  primerMovimiento: Date | null,
  hoy: Date,
  cerrados: { mes: number; anio: number }[]
): number {
  if (!primerMovimiento) return 0;
  const cerradosSet = new Set(cerrados.map((c) => `${c.anio}-${c.mes}`));

  let cursor = new Date(primerMovimiento.getFullYear(), primerMovimiento.getMonth(), 1);
  const limite = new Date(hoy.getFullYear(), hoy.getMonth(), 1); // mes actual, exclusivo

  let count = 0;
  while (cursor.getTime() < limite.getTime()) {
    const key = `${cursor.getFullYear()}-${cursor.getMonth() + 1}`;
    if (!cerradosSet.has(key)) count++;
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
  }
  return count;
}

export function inicioSemana(now: Date): Date {
  const x = new Date(now);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function finSemana(now: Date): Date {
  const x = inicioSemana(now);
  x.setDate(x.getDate() + 7);
  return x;
}
