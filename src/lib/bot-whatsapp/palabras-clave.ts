import { PALABRAS_CLAVE_BIENVENIDA, PREFIJOS_PRECARGADOS_WEB } from "./constantes";

/** Minúsculas y sin tildes (también la ñ queda como n: no cambia el filtro). */
export function normalizarTexto(texto: string): string {
  return texto.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

const PALABRAS = new Set(PALABRAS_CLAVE_BIENVENIDA.map(normalizarTexto));
const PREFIJOS = PREFIJOS_PRECARGADOS_WEB.map(normalizarTexto);

/** Filtro sin IA del mensaje de bienvenida (sin saldo): ¿el primer mensaje
 * de un número nuevo parece una consulta por MOVARA? */
export function pasaFiltroPalabras(texto: string): boolean {
  const t = normalizarTexto(texto).trim();
  if (PREFIJOS.some((p) => t.startsWith(p))) return true;
  return t.split(/[^a-z0-9]+/).some((palabra) => PALABRAS.has(palabra));
}
