import { partesAR } from "@/lib/fecha-ar";
import { DIAS, type HorarioAtencion } from "./constantes";

const DIA_POR_INDICE = ["dom", "lun", "mar", "mie", "jue", "vie", "sab"] as const satisfies readonly (typeof DIAS)[number][];

/** ¿El instante cae dentro del horario de atención (hora de Córdoba)? Cada
 * franja incluye la hora de apertura y excluye la de cierre. */
export function dentroDeHorario(horario: HorarioAtencion, ahora: Date = new Date()): boolean {
  const { diaSemana, hora, minuto } = partesAR(ahora);
  const actual = `${String(hora).padStart(2, "0")}:${String(minuto).padStart(2, "0")}`;
  return (horario[DIA_POR_INDICE[diaSemana]] ?? []).some((f) => f.desde <= actual && actual < f.hasta);
}
