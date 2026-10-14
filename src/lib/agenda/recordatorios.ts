import { fechaKeyToDate, dateToFechaKey, addDiasFechaKey } from "@/lib/agenda/fecha";

// El cron corre dos veces por día (9:00 y 21:00 hora Argentina, ver
// vercel.json) y manda el recordatorio a las citas que empiezan dentro de
// esta ventana. Con esos horarios cada cita cae en la ventana en dos corridas
// (la mañana y la noche del día anterior): 2 intentos como máximo.
export const VENTANA_RECORDATORIO_MIN_HORAS = 12;
export const VENTANA_RECORDATORIO_MAX_HORAS = 36;
export const MAX_INTENTOS_RECORDATORIO = 2;

const HORA_MS = 60 * 60 * 1000;
// Argentina es UTC-3 todo el año (sin horario de verano).
const OFFSET_ARGENTINA_HORAS = 3;

/** Instante de inicio de la cita: la fecha se guarda a medianoche UTC y el
 * horario ("10:00") es hora de Argentina. */
export function inicioCita(fecha: Date, horario: string): Date {
  const [hh, mm] = horario.split(":").map(Number);
  return new Date(Date.UTC(fecha.getUTCFullYear(), fecha.getUTCMonth(), fecha.getUTCDate(), hh + OFFSET_ARGENTINA_HORAS, mm || 0));
}

/** Fechas (date-only) que pueden tener citas dentro de la ventana. */
export function fechasPosiblesVentana(ahora: Date): Date[] {
  const hoy = dateToFechaKey(ahora);
  return [0, 1, 2].map((d) => fechaKeyToDate(addDiasFechaKey(hoy, d)));
}

/** Faltan más de 12 y hasta 36 horas para la cita. */
export function enVentanaRecordatorio(inicio: Date, ahora: Date): boolean {
  const faltan = inicio.getTime() - ahora.getTime();
  return faltan > VENTANA_RECORDATORIO_MIN_HORAS * HORA_MS && faltan <= VENTANA_RECORDATORIO_MAX_HORAS * HORA_MS;
}

type CitaRecordatorio = {
  fecha: Date;
  horario: string;
  estado: string;
  recordatorioEnviado: boolean;
  recordatorioIntentos: number;
};

/** "Recordatorio no enviado": se intentó y falló, y ya no quedan intentos
 * (se agotaron o faltan 12 horas o menos para la cita). */
export function recordatorioNoEnviado(cita: CitaRecordatorio, ahora: Date): boolean {
  if (cita.estado !== "confirmada" || cita.recordatorioEnviado || cita.recordatorioIntentos === 0) return false;
  if (cita.recordatorioIntentos >= MAX_INTENTOS_RECORDATORIO) return true;
  return inicioCita(cita.fecha, cita.horario).getTime() - ahora.getTime() <= VENTANA_RECORDATORIO_MIN_HORAS * HORA_MS;
}
