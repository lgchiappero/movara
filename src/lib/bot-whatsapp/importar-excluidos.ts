import { telefonoWhatsapp } from "@/lib/bot-whatsapp/telefono";

/** Largo máximo de la etiqueta (el nombre del contacto importado). */
export const MAX_ETIQUETA_IMPORTADA = 80;
/** Etiqueta para un contacto del .vcf sin nombre. */
export const ETIQUETA_SIN_NOMBRE = "OTRO";
/** Característica que se propone para los números agendados sin código de área. */
export const CARACTERISTICA_POR_DEFECTO = "3493";

export type FilaImportada = { telefono: string; nombre: string | null };
export type Importacion = {
  nuevos: { telefono: string; etiqueta: string }[];
  repetidos: number;
  yaExcluidos: number;
  invalidos: number;
  /** De los nuevos, cuántos se completaron con la característica por defecto. */
  completados: number;
};

/** Característica escrita como sea ("3493", "03493", " 0 3493 ") → sus
 * 2 a 4 dígitos sin el 0; null si no es válida. Vacía = sin característica. */
export function limpiarCaracteristica(entrada: string): string | null {
  const d = entrada.replace(/\D/g, "").replace(/^0/, "");
  return /^[1-9]\d{1,3}$/.test(d) ? d : null;
}

/** Número local sin código de área ("66-7214", "15 667214") + la
 * característica → 549 + 10 dígitos. Solo si con la característica da
 * exactamente 10 dígitos; un número internacional (+ o 00) nunca se toca. */
function completar(entrada: string, caracteristica: string): string | null {
  const texto = entrada.trim();
  if (texto.startsWith("+")) return null;
  let d = texto.replace(/\D/g, "");
  if (d.startsWith("00")) return null;
  if (d.startsWith("15") && caracteristica.length + d.length - 2 === 10) d = d.slice(2);
  return caracteristica.length + d.length === 10 ? `549${caracteristica}${d}` : null;
}

/** Teléfono normalizado con el helper de siempre; si no se puede y hay
 * característica por defecto, se prueba completándolo con ella. */
export function normalizarImportado(entrada: string, caracteristica: string | null): { telefono: string; completado: boolean } | null {
  const telefono = telefonoWhatsapp(entrada);
  if (telefono) return { telefono, completado: false };
  const completo = caracteristica ? completar(entrada, caracteristica) : null;
  return completo ? { telefono: completo, completado: true } : null;
}

/** Separa: los que se agregan, los repetidos dentro del archivo, los que ya
 * estaban excluidos y los que no se pueden interpretar. Si el mismo
 * teléfono aparece dos veces, queda el nombre del primero. */
export function prepararImportacion(
  filas: FilaImportada[],
  yaExcluidos: ReadonlySet<string>,
  caracteristica: string | null = null,
): Importacion {
  const vistos = new Set<string>();
  const resultado: Importacion = { nuevos: [], repetidos: 0, yaExcluidos: 0, invalidos: 0, completados: 0 };
  for (const fila of filas) {
    const normalizado = normalizarImportado(fila.telefono, caracteristica);
    if (!normalizado) resultado.invalidos++;
    else if (vistos.has(normalizado.telefono)) resultado.repetidos++;
    else {
      vistos.add(normalizado.telefono);
      if (yaExcluidos.has(normalizado.telefono)) resultado.yaExcluidos++;
      else {
        const etiqueta = (fila.nombre ?? "").replace(/\s+/g, " ").trim().slice(0, MAX_ETIQUETA_IMPORTADA).trim();
        resultado.nuevos.push({ telefono: normalizado.telefono, etiqueta: etiqueta || ETIQUETA_SIN_NOMBRE });
        if (normalizado.completado) resultado.completados++;
      }
    }
  }
  return resultado;
}

/** Teléfonos válidos del archivo (para buscar en la base cuáles ya están). */
export function telefonosValidos(filas: FilaImportada[], caracteristica: string | null = null): string[] {
  return [...new Set(filas.map((f) => normalizarImportado(f.telefono, caracteristica)?.telefono).filter((t): t is string => !!t))];
}
