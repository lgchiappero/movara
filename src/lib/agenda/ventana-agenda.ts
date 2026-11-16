import { sumarDias, type ClaveFecha } from "@/lib/fecha-ar";

/** Días hacia adelante que se miran para decidir si la agenda está abierta.
 * Si en esta ventana no hay ningún día "disponible", /agendar muestra el
 * aviso "Próximamente" en lugar del calendario. */
export const DIAS_VENTANA_AGENDA = 60;

export type EstadoDia = "disponible" | "completo";

/** Clave del caché de AgendaBooking: año y mes en base 0, como el calendario. */
export function claveMes(anio: number, mesIdx0: number): string {
  return `${anio}-${mesIdx0}`;
}

/** Meses (año, mes en base 0) que cubren desde `hoy` hasta `hoy + dias`,
 * ambos inclusive, en hora argentina (claves de src/lib/fecha-ar.ts). */
export function mesesDeLaVentana(hoy: ClaveFecha, dias = DIAS_VENTANA_AGENDA): { anio: number; mesIdx0: number }[] {
  const fin = sumarDias(hoy, dias);
  const [anioFin, mesFin] = fin.split("-").map(Number);
  let [anio, mes] = hoy.split("-").map(Number);
  const meses: { anio: number; mesIdx0: number }[] = [];
  while (anio < anioFin || (anio === anioFin && mes <= mesFin)) {
    meses.push({ anio, mesIdx0: mes - 1 });
    if (mes === 12) {
      anio += 1;
      mes = 1;
    } else {
      mes += 1;
    }
  }
  return meses;
}

/** ¿Hay algún día "disponible" entre `hoy` y `hoy + dias`? `null` mientras
 * falte cargar algún mes de la ventana: no se decide con datos a medias. */
export function hayDiaDisponibleEnVentana(
  diasPorMes: Record<string, Record<string, EstadoDia>>,
  hoy: ClaveFecha,
  dias = DIAS_VENTANA_AGENDA
): boolean | null {
  const meses = mesesDeLaVentana(hoy, dias);
  if (!meses.every(({ anio, mesIdx0 }) => claveMes(anio, mesIdx0) in diasPorMes)) return null;
  const fin = sumarDias(hoy, dias);
  return meses.some(({ anio, mesIdx0 }) =>
    Object.entries(diasPorMes[claveMes(anio, mesIdx0)]).some(
      ([dia, estado]) => estado === "disponible" && dia >= hoy && dia <= fin
    )
  );
}
