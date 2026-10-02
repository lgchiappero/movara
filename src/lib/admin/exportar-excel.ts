import * as XLSX from "xlsx";

/** Descarga `filas` como un .xlsx de una sola hoja — las claves de cada
 * fila son los encabezados de columna (en el orden en que aparecen). */
export function exportarExcel(filas: Record<string, unknown>[], hoja: string, archivo: string): void {
  const ws = XLSX.utils.json_to_sheet(filas);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, hoja);
  XLSX.writeFile(wb, archivo);
}
