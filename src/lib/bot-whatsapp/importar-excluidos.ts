import { telefonoWhatsapp } from "@/lib/bot-whatsapp/telefono";

/** Largo máximo de la etiqueta (el nombre del contacto importado). */
export const MAX_ETIQUETA_IMPORTADA = 80;
/** Etiqueta para un contacto del .vcf sin nombre. */
export const ETIQUETA_SIN_NOMBRE = "OTRO";

export type FilaImportada = { telefono: string; nombre: string | null };
export type Importacion = {
  nuevos: { telefono: string; etiqueta: string }[];
  repetidos: number;
  yaExcluidos: number;
  invalidos: number;
};

/** Normaliza los teléfonos con el helper de siempre y separa: los que se
 * agregan, los repetidos dentro del archivo, los que ya estaban excluidos y
 * los que no se pueden interpretar (sin código de área, muy cortos…). Si
 * el mismo teléfono aparece dos veces, queda el nombre del primero. */
export function prepararImportacion(filas: FilaImportada[], yaExcluidos: ReadonlySet<string>): Importacion {
  const vistos = new Set<string>();
  const resultado: Importacion = { nuevos: [], repetidos: 0, yaExcluidos: 0, invalidos: 0 };
  for (const fila of filas) {
    const telefono = telefonoWhatsapp(fila.telefono);
    if (!telefono) resultado.invalidos++;
    else if (vistos.has(telefono)) resultado.repetidos++;
    else {
      vistos.add(telefono);
      if (yaExcluidos.has(telefono)) resultado.yaExcluidos++;
      else {
        const etiqueta = (fila.nombre ?? "").replace(/\s+/g, " ").trim().slice(0, MAX_ETIQUETA_IMPORTADA).trim();
        resultado.nuevos.push({ telefono, etiqueta: etiqueta || ETIQUETA_SIN_NOMBRE });
      }
    }
  }
  return resultado;
}

/** Teléfonos válidos del archivo (para buscar en la base cuáles ya están). */
export function telefonosValidos(filas: FilaImportada[]): string[] {
  return [...new Set(filas.map((f) => telefonoWhatsapp(f.telefono)).filter((t): t is string => t !== null))];
}
