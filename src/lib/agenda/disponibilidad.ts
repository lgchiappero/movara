import { db } from "@/lib/db";
import { fechaKeyToDate, dateToFechaKey, hoyFechaKey } from "@/lib/agenda/fecha";

/** Horarios habilitados de un día y cuáles ya están ocupados por una cita
 * activa — para poder mostrar los ocupados en gris (no solo omitirlos).
 * Devuelve ambos vacíos si el día no está habilitado o ya pasó. */
export async function getEstadoHorariosDelDia(
  fechaKey: string
): Promise<{ habilitados: string[]; ocupados: string[] }> {
  if (fechaKey < hoyFechaKey()) return { habilitados: [], ocupados: [] };
  const fecha = fechaKeyToDate(fechaKey);

  const [disponibilidad, citas] = await Promise.all([
    db.disponibilidadAgenda.findUnique({ where: { fecha } }),
    db.cita.findMany({
      where: { fecha, estado: { not: "cancelada" } },
      select: { horario: true },
    }),
  ]);

  if (!disponibilidad || !disponibilidad.habilitada) return { habilitados: [], ocupados: [] };
  return { habilitados: disponibilidad.horarios, ocupados: citas.map((c) => c.horario) };
}

/** Horarios libres de un día — ya excluye los ocupados por una cita activa. */
export async function getHorariosDisponibles(fechaKey: string): Promise<string[]> {
  const { habilitados, ocupados } = await getEstadoHorariosDelDia(fechaKey);
  const ocupadosSet = new Set(ocupados);
  return habilitados.filter((h) => !ocupadosSet.has(h));
}

export type EstadoDiaMes = "disponible" | "completo";

/** Estado de cada día habilitado del mes `anio`-`mes` (1-12) para el
 * calendario público — "disponible" tiene al menos un horario libre,
 * "completo" está habilitado pero todos sus horarios ya están ocupados.
 * Un día que no aparece en el resultado no está habilitado (o ya pasó). */
export async function getEstadoDiasDelMes(
  anio: number,
  mes: number
): Promise<Record<string, EstadoDiaMes>> {
  const desde = new Date(Date.UTC(anio, mes - 1, 1));
  const hasta = new Date(Date.UTC(anio, mes, 1));

  const [disponibilidades, citas] = await Promise.all([
    db.disponibilidadAgenda.findMany({
      where: { fecha: { gte: desde, lt: hasta }, habilitada: true },
    }),
    db.cita.findMany({
      where: { fecha: { gte: desde, lt: hasta }, estado: { not: "cancelada" } },
      select: { fecha: true, horario: true },
    }),
  ]);

  const ocupadosPorDia = new Map<string, Set<string>>();
  for (const c of citas) {
    const key = dateToFechaKey(c.fecha);
    if (!ocupadosPorDia.has(key)) ocupadosPorDia.set(key, new Set());
    ocupadosPorDia.get(key)!.add(c.horario);
  }

  const hoy = hoyFechaKey();
  const resultado: Record<string, EstadoDiaMes> = {};
  for (const d of disponibilidades) {
    const key = dateToFechaKey(d.fecha);
    if (key < hoy || d.horarios.length === 0) continue;
    const ocupados = ocupadosPorDia.get(key) ?? new Set();
    const libres = d.horarios.filter((h) => !ocupados.has(h));
    resultado[key] = libres.length > 0 ? "disponible" : "completo";
  }
  return resultado;
}
