/** Días de calendario entre `ahora` y `fecha` (ambos truncados a medianoche
 * local) — positivo si `fecha` es futura, negativo si ya pasó, null si no
 * hay fecha cargada. Usado para "días restantes hasta arribo". */
export function diasHasta(fecha: Date | null, ahora: Date): number | null {
  if (!fecha) return null;
  const msPorDia = 24 * 60 * 60 * 1000;
  const inicioHoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate()).getTime();
  const inicioFecha = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate()).getTime();
  return Math.round((inicioFecha - inicioHoy) / msPorDia);
}

/** De las secciones "críticas" dadas, cuáles no tienen ningún documento
 * subido todavía — para la unidad cuyas secciones de documentos son
 * `seccionesConDocumento`. */
export function seccionesFaltantes(seccionesConDocumento: string[], criticas: readonly string[]): string[] {
  const presentes = new Set(seccionesConDocumento);
  return criticas.filter((s) => !presentes.has(s));
}
