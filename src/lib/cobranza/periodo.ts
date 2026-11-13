import {
  claveInicioMes,
  claveSoloFecha,
  esClaveFechaValida,
  hoyAR,
  hoySoloFechaAR,
  mesAnioAR,
  soloFecha,
  sumarDias,
  sumarMeses,
} from "@/lib/fecha-ar";

export const PERIODO_TIPO_OPTIONS = ["mes_actual", "mes_anterior", "trimestre", "anio", "personalizado"] as const;
export type PeriodoTipo = (typeof PERIODO_TIPO_OPTIONS)[number];

export const PERIODO_TIPO_LABELS: Record<PeriodoTipo, string> = {
  mes_actual: "Este mes",
  mes_anterior: "Mes anterior",
  trimestre: "Este trimestre",
  anio: "Este año",
  personalizado: "Rango personalizado",
};

/** Rango de fechas SIN HORA (medianoche UTC, como se guardan las fechas de
 * los pagos): `desde` inclusivo, `hasta` exclusivo, listo para un filtro
 * Prisma `{ gte: desde, lt: hasta }` sobre Movimiento.fecha. Los meses son
 * los del calendario argentino (fecha-ar.ts), no los de la máquina. */
export type RangoPeriodo = { desde: Date; hasta: Date };

function inicioMes(anio: number, mesIdx0: number): Date {
  return soloFecha(sumarMeses(`${anio}-01-01`, mesIdx0));
}

/** [desde, hasta) del período, en fechas sin hora. */
export function calcularRangoPeriodo(
  tipo: PeriodoTipo,
  now: Date,
  desdeParam?: string | null,
  hastaParam?: string | null
): RangoPeriodo {
  const { anio, mes: mes1 } = mesAnioAR(now);
  const mes = mes1 - 1;

  if (tipo === "mes_anterior") {
    return { desde: inicioMes(anio, mes - 1), hasta: inicioMes(anio, mes) };
  }
  if (tipo === "trimestre") {
    const inicioTrimestre = Math.floor(mes / 3) * 3;
    return { desde: inicioMes(anio, inicioTrimestre), hasta: inicioMes(anio, inicioTrimestre + 3) };
  }
  if (tipo === "anio") {
    return { desde: inicioMes(anio, 0), hasta: inicioMes(anio + 1, 0) };
  }
  if (tipo === "personalizado" && desdeParam && hastaParam) {
    const desde = claveDeParam(desdeParam);
    const hasta = claveDeParam(hastaParam);
    if (desde && hasta) {
      // `hasta` llega como fecha (sin hora) del date picker — se interpreta
      // inclusiva, así que el límite exclusivo real es el día siguiente.
      return { desde: soloFecha(desde), hasta: soloFecha(sumarDias(hasta, 1)) };
    }
  }
  // default / "mes_actual"
  return { desde: inicioMes(anio, mes), hasta: inicioMes(anio, mes + 1) };
}

/** "YYYY-MM-DD" (o un ISO con hora: se toma su fecha) → clave; null si no es una fecha. */
function claveDeParam(valor: string): string | null {
  const clave = valor.slice(0, 10);
  return esClaveFechaValida(clave) ? clave : null;
}

/** Si el rango coincide exactamente con un único mes calendario, devuelve
 * ese {mes, anio} (1-12) — usado para el badge/botón de cierre, que solo
 * tiene sentido para un mes puntual, no para un trimestre/año/rango
 * arbitrario. */
export function mesAnioUnico(rango: RangoPeriodo): { mes: number; anio: number } | null {
  const desde = claveSoloFecha(rango.desde);
  if (!desde.endsWith("-01") || rango.desde.getTime() !== soloFecha(desde).getTime()) return null;
  if (claveSoloFecha(rango.hasta) !== sumarMeses(desde, 1) || rango.hasta.getTime() !== soloFecha(sumarMeses(desde, 1)).getTime()) {
    return null;
  }
  const [anio, mes] = desde.split("-").map(Number);
  return { mes, anio };
}

/** Cuenta los meses calendario, desde el mes del primer movimiento (su
 * fecha, sin hora) hasta el mes anterior al actual en Argentina (el mes
 * actual nunca cuenta: todavía no terminó, no se puede cerrar), que no
 * tienen un cierre registrado. Sin movimientos todavía, no hay nada que
 * cerrar. */
export function contarPeriodosSinCerrar(
  primerMovimiento: Date | null,
  hoy: Date,
  cerrados: { mes: number; anio: number }[]
): number {
  if (!primerMovimiento) return 0;
  const cerradosSet = new Set(cerrados.map((c) => `${c.anio}-${c.mes}`));

  let cursor = claveSoloFecha(primerMovimiento).slice(0, 8) + "01";
  const limite = claveInicioMes(hoy); // mes actual, exclusivo

  let count = 0;
  while (cursor < limite) {
    const [anio, mes] = cursor.split("-").map(Number);
    if (!cerradosSet.has(`${anio}-${mes}`)) count++;
    cursor = sumarMeses(cursor, 1);
  }
  return count;
}

/** "Vence esta semana" = los próximos 7 días a partir de hoy (Argentina),
 * en fechas sin hora: [hoy, hoy + 7) — para comparar con vencimientos. */
export function inicioSemana(now: Date): Date {
  return hoySoloFechaAR(now);
}

export function finSemana(now: Date): Date {
  return soloFecha(sumarDias(hoyAR(now), 7));
}
