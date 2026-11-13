// Fechas del sitio en hora argentina (America/Argentina/Cordoba), sin
// depender de la zona horaria de la máquina que corre el código: el server
// de Vercel corre en UTC, el navegador del usuario en la suya y la Mac en
// la suya. Todo "día", "mes" o "año" se calcula acá.
//
// Hay dos clases de valores:
//
// 1. INSTANTES (createdAt, contactadoEn, confirmadoAt, …): un momento real.
//    Se guardan en UTC; el día/mes al que pertenecen y cómo se muestran se
//    calculan en hora argentina → claveAR, inicioDiaAR, inicioMesAR,
//    formatearFechaAR, formatearFechaHoraAR.
//
// 2. SOLO FECHA (vencimiento de cuotas, fecha de citas, de pagos, de
//    entrega, garantía…): un día de calendario sin hora, cargado con un
//    <input type="date"> ("YYYY-MM-DD") y guardado a medianoche UTC. No se
//    convierte de zona (correrlo 3 h lo mueve al día anterior): se compara y
//    se muestra por su fecha calendario → soloFecha, claveSoloFecha,
//    hoySoloFechaAR, esVencida, formatearSoloFecha.
//
// "Clave" = "YYYY-MM-DD".

export const ZONA_AR = "America/Argentina/Cordoba";

export type ClaveFecha = string;

const MS_DIA = 24 * 60 * 60 * 1000;
const CLAVE_REGEX = /^(\d{4})-(\d{2})-(\d{2})$/;

const partesFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: ZONA_AR,
  hourCycle: "h23",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  weekday: "short",
});

const DIAS_SEMANA = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export type PartesAR = {
  anio: number;
  /** 1–12 */
  mes: number;
  dia: number;
  hora: number;
  minuto: number;
  segundo: number;
  /** 0 = domingo … 6 = sábado */
  diaSemana: number;
};

/** Componentes de calendario y reloj de un instante, en hora argentina. */
export function partesAR(instante: Date = new Date()): PartesAR {
  const p: Record<string, string> = {};
  for (const { type, value } of partesFormatter.formatToParts(instante)) p[type] = value;
  return {
    anio: Number(p.year),
    mes: Number(p.month),
    dia: Number(p.day),
    hora: Number(p.hour),
    minuto: Number(p.minute),
    segundo: Number(p.second),
    diaSemana: DIAS_SEMANA.indexOf(p.weekday),
  };
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function clave(anio: number, mes: number, dia: number): ClaveFecha {
  // Normaliza desbordes (mes 13, día 0, …) con aritmética UTC pura.
  const d = new Date(Date.UTC(anio, mes - 1, dia));
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

function partesClave(c: ClaveFecha): [number, number, number] {
  const m = CLAVE_REGEX.exec(c);
  if (!m) throw new Error(`Fecha inválida: "${c}" (se espera YYYY-MM-DD)`);
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

export function esClaveFechaValida(valor: string): boolean {
  const m = CLAVE_REGEX.exec(valor);
  if (!m) return false;
  return clave(Number(m[1]), Number(m[2]), Number(m[3])) === valor;
}

// ── Instantes ───────────────────────────────────────────────────────────

/** Día de calendario argentino de un instante. */
export function claveAR(instante: Date = new Date()): ClaveFecha {
  const p = partesAR(instante);
  return clave(p.anio, p.mes, p.dia);
}

/** Hoy en Argentina ("YYYY-MM-DD"). */
export function hoyAR(ahora: Date = new Date()): ClaveFecha {
  return claveAR(ahora);
}

/** Diferencia (ms) entre la hora argentina y UTC en ese instante (−3 h). */
function offsetAR(instante: number): number {
  const p = partesAR(new Date(instante));
  const comoUTC = Date.UTC(p.anio, p.mes - 1, p.dia, p.hora, p.minuto, p.segundo);
  return comoUTC - Math.floor(instante / 1000) * 1000;
}

/** El instante en que en Argentina es `c` a las hh:mm. */
export function instanteAR(c: ClaveFecha, hora = 0, minuto = 0): Date {
  const [anio, mes, dia] = partesClave(c);
  const comoUTC = Date.UTC(anio, mes - 1, dia, hora, minuto);
  let t = comoUTC - offsetAR(comoUTC);
  t = comoUTC - offsetAR(t); // por si el offset cambia en ese tramo
  return new Date(t);
}

/** 00:00 en Argentina del día de `instante`. */
export function inicioDiaAR(instante: Date = new Date()): Date {
  return instanteAR(claveAR(instante));
}

/** Último milisegundo (23:59:59.999) en Argentina del día de `instante`. */
export function finDiaAR(instante: Date = new Date()): Date {
  return new Date(instanteAR(sumarDias(claveAR(instante), 1)).getTime() - 1);
}

/** 00:00 en Argentina del día 1 del mes de `instante`, corrido `meses`
 * meses (−1 = mes anterior, 1 = mes siguiente). */
export function inicioMesAR(instante: Date = new Date(), meses = 0): Date {
  return instanteAR(claveInicioMes(instante, meses));
}

/** 00:00 en Argentina del lunes de la semana de `instante`. */
export function inicioSemanaAR(instante: Date = new Date()): Date {
  const { diaSemana } = partesAR(instante);
  const desdeLunes = (diaSemana + 6) % 7;
  return instanteAR(sumarDias(claveAR(instante), -desdeLunes));
}

/** 00:00 en Argentina del 1 de enero del año de `instante` (+ `anios`). */
export function inicioAnioAR(instante: Date = new Date(), anios = 0): Date {
  return instanteAR(clave(partesAR(instante).anio + anios, 1, 1));
}

/** Año calendario argentino (numeración MOV-…-AAAA-NNN, copyright, …). */
export function anioAR(instante: Date = new Date()): number {
  return partesAR(instante).anio;
}

/** Mes (1–12) y año argentinos de un instante. */
export function mesAnioAR(instante: Date = new Date()): { mes: number; anio: number } {
  const p = partesAR(instante);
  return { mes: p.mes, anio: p.anio };
}

/** "YYYY-MM-01" del mes de `instante` en Argentina, corrido `meses`. */
export function claveInicioMes(instante: Date = new Date(), meses = 0): ClaveFecha {
  const p = partesAR(instante);
  return clave(p.anio, p.mes + meses, 1);
}

// ── Claves ──────────────────────────────────────────────────────────────

export function sumarDias(c: ClaveFecha, dias: number): ClaveFecha {
  const [anio, mes, dia] = partesClave(c);
  return clave(anio, mes, dia + dias);
}

export function sumarMeses(c: ClaveFecha, meses: number): ClaveFecha {
  const [anio, mes, dia] = partesClave(c);
  // Último día válido del mes de destino (31/1 + 1 mes = 28 o 29/2).
  const ultimo = new Date(Date.UTC(anio, mes - 1 + meses + 1, 0)).getUTCDate();
  return clave(anio, mes + meses, Math.min(dia, ultimo));
}

/** Días de calendario de `desde` a `hasta` (positivo si `hasta` es posterior). */
export function diasEntre(desde: ClaveFecha, hasta: ClaveFecha): number {
  return Math.round((soloFecha(hasta).getTime() - soloFecha(desde).getTime()) / MS_DIA);
}

// ── Solo fecha (guardadas a medianoche UTC) ─────────────────────────────

/** "YYYY-MM-DD" → Date a medianoche UTC (cómo se guardan las fechas sin hora). */
export function soloFecha(c: ClaveFecha): Date {
  const [anio, mes, dia] = partesClave(c);
  return new Date(Date.UTC(anio, mes - 1, dia));
}

/** Fecha sin hora (Date a medianoche UTC o string ISO/“YYYY-MM-DD”) → su
 * "YYYY-MM-DD", sin convertir de zona. */
export function claveSoloFecha(valor: Date | string): ClaveFecha {
  if (typeof valor === "string" && CLAVE_REGEX.test(valor)) return valor;
  const d = new Date(valor);
  return clave(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
}

/** Hoy en Argentina, como fecha sin hora (para comparar con campos de solo
 * fecha en una query: `{ vencimiento: { lt: hoySoloFechaAR() } }`). */
export function hoySoloFechaAR(ahora: Date = new Date()): Date {
  return soloFecha(hoyAR(ahora));
}

/** Día 1 del mes argentino de `ahora` (+ `meses`), como fecha sin hora. */
export function inicioMesSoloFechaAR(ahora: Date = new Date(), meses = 0): Date {
  return soloFecha(claveInicioMes(ahora, meses));
}

/** Un vencimiento (solo fecha) está vencido desde el día siguiente: la
 * cuota que vence hoy todavía no. Sin vencimiento, nunca. */
export function esVencida(vencimiento: Date | string | null | undefined, ahora: Date = new Date()): boolean {
  if (vencimiento === null || vencimiento === undefined) return false;
  if (Number.isNaN(new Date(vencimiento).getTime()) && !CLAVE_REGEX.test(String(vencimiento))) return false;
  return claveSoloFecha(vencimiento) < hoyAR(ahora);
}

/** Días desde hoy (Argentina) hasta una fecha sin hora: positivo si es
 * futura, negativo si ya pasó. */
export function diasHastaSoloFecha(fecha: Date | string, ahora: Date = new Date()): number {
  return diasEntre(hoyAR(ahora), claveSoloFecha(fecha));
}

// ── Formato (es-AR, 24 h) ───────────────────────────────────────────────

export type EstiloFecha = "corto" | "largo" | "largoConDia";

const ESTILOS: Record<EstiloFecha, Intl.DateTimeFormatOptions> = {
  corto: { day: "numeric", month: "numeric", year: "numeric" }, // 11/11/2026
  largo: { day: "numeric", month: "long", year: "numeric" }, // 11 de noviembre de 2026
  largoConDia: { weekday: "long", day: "numeric", month: "long", year: "numeric" }, // miércoles, 11 de noviembre de 2026
};

function opciones(estilo: EstiloFecha | Intl.DateTimeFormatOptions): Intl.DateTimeFormatOptions {
  return typeof estilo === "string" ? ESTILOS[estilo] : estilo;
}

function aDate(valor: Date | string | number): Date {
  return valor instanceof Date ? valor : new Date(valor);
}

/** Fecha de un instante, en hora argentina. */
export function formatearFechaAR(
  instante: Date | string | number,
  estilo: EstiloFecha | Intl.DateTimeFormatOptions = "corto"
): string {
  return aDate(instante).toLocaleDateString("es-AR", { ...opciones(estilo), timeZone: ZONA_AR });
}

/** Fecha y hora (24 h) de un instante, en hora argentina: "11/11/2026, 14:05". */
export function formatearFechaHoraAR(instante: Date | string | number): string {
  return aDate(instante).toLocaleString("es-AR", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: ZONA_AR,
  });
}

/** Una fecha sin hora (vencimiento, fecha de entrega, de cita…), tal cual
 * se cargó, sin correrla de día. */
export function formatearSoloFecha(
  fecha: Date | string,
  estilo: EstiloFecha | Intl.DateTimeFormatOptions = "corto"
): string {
  return soloFecha(claveSoloFecha(fecha)).toLocaleDateString("es-AR", { ...opciones(estilo), timeZone: "UTC" });
}
