/** De las secciones "críticas" dadas, cuáles no tienen ningún documento
 * subido todavía — para la unidad cuyas secciones de documentos son
 * `seccionesConDocumento`. */
export function seccionesFaltantes(seccionesConDocumento: string[], criticas: readonly string[]): string[] {
  const presentes = new Set(seccionesConDocumento);
  return criticas.filter((s) => !presentes.has(s));
}
