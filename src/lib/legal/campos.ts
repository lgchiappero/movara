/** Un campo a completar: CUALQUIER texto entre corchetes, ej. "[CUIT]" o
 * "[Rafaela]". Un texto legal publicado nunca lleva corchetes. */
export const CAMPO_PENDIENTE = /\[[^\]\n]+\]/g;

export type BloqueLegal = { tipo: "p"; texto: string } | { tipo: "lista"; items: string[] };
export type SeccionLegal = { id: string; titulo: string; bloques: BloqueLegal[] };
export type DocumentoLegal = { titulo: string; actualizado: string; intro: string; secciones: SeccionLegal[] };

function textos(doc: DocumentoLegal): string[] {
  return [
    doc.titulo,
    doc.actualizado,
    doc.intro,
    ...doc.secciones.flatMap((s) => [s.titulo, ...s.bloques.flatMap((b) => (b.tipo === "p" ? [b.texto] : b.items))]),
  ];
}

/** Campos sin completar del documento, sin repetir: ["[CUIT]", ...]. */
export function camposPendientes(doc: DocumentoLegal): string[] {
  return [...new Set(textos(doc).flatMap((t) => t.match(CAMPO_PENDIENTE) ?? []))];
}

/** En producción no se publica un texto legal con campos sin completar: la
 * página llama a esto al renderizarse, y como es estática se renderiza en
 * `next build` — el build falla con la lista de lo que falta. */
export function asegurarSinCamposPendientes(doc: DocumentoLegal, entorno: string | undefined = process.env.NODE_ENV): void {
  const faltan = camposPendientes(doc);
  if (entorno === "production" && faltan.length > 0) {
    throw new Error(
      `[legal] "${doc.titulo}" tiene campos sin completar: ${faltan.join(", ")}. Completalos en src/data/legal/empresa.ts antes de publicar.`
    );
  }
}

/** Parte un texto en tramos normales y campos pendientes (para resaltarlos). */
export function partirPorCampos(texto: string): { texto: string; campo: boolean }[] {
  const partes: { texto: string; campo: boolean }[] = [];
  let ultimo = 0;
  for (const m of texto.matchAll(CAMPO_PENDIENTE)) {
    if (m.index! > ultimo) partes.push({ texto: texto.slice(ultimo, m.index), campo: false });
    partes.push({ texto: m[0], campo: true });
    ultimo = m.index! + m[0].length;
  }
  if (ultimo < texto.length) partes.push({ texto: texto.slice(ultimo), campo: false });
  return partes;
}
