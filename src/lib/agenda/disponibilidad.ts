import { db } from "@/lib/db";
import { fechaKeyToDate, dateToFechaKey, hoyFechaKey } from "@/lib/agenda/fecha";

/** Horarios libres de un día — ya excluye los ocupados por una cita activa.
 * Devuelve [] si el día no está habilitado o ya pasó. */
export async function getHorariosDisponibles(fechaKey: string): Promise<string[]> {
  if (fechaKey < hoyFechaKey()) return [];
  const fecha = fechaKeyToDate(fechaKey);

  const [disponibilidad, citas] = await Promise.all([
    db.disponibilidadAgenda.findUnique({ where: { fecha } }),
    db.cita.findMany({
      where: { fecha, estado: { not: "cancelada" } },
      select: { horario: true },
    }),
  ]);

  if (!disponibilidad || !disponibilidad.habilitada) return [];

  const ocupados = new Set(citas.map((c) => c.horario));
  return disponibilidad.horarios.filter((h) => !ocupados.has(h));
}

/** Set de "YYYY-MM-DD" del mes `anio`-`mes` (1-12) que tienen al menos un
 * horario libre — para resaltar el calendario público. */
export async function getDiasDisponiblesDelMes(anio: number, mes: number): Promise<Set<string>> {
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
  const disponibles = new Set<string>();
  for (const d of disponibilidades) {
    const key = dateToFechaKey(d.fecha);
    if (key < hoy) continue;
    const ocupados = ocupadosPorDia.get(key) ?? new Set();
    const libres = d.horarios.filter((h) => !ocupados.has(h));
    if (libres.length > 0) disponibles.add(key);
  }
  return disponibles;
}
