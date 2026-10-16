// Tipos y tamaño que acepta cada destino de subida del admin, para validar
// en el navegador ANTES de subir. Salen de las mismas constantes que valida
// el servidor (file-validation.ts), así no pueden quedar distintos.
import {
  ALLOWED_MIME_TYPES,
  ALLOWED_MIME_TYPES_MOVARA,
  MAX_FILE_SIZE_BYTES,
  MAX_FILE_SIZE_BYTES_MOVARA,
} from "@/lib/admin/file-validation";

export type TiposArchivo = {
  /** Tipos MIME que acepta el servidor. */
  mimes: readonly string[];
  /** Para el atributo accept del input (y para reconocer por extensión). */
  extensiones: readonly string[];
  /** "PDF, JPG, PNG o Excel" — se muestra debajo de la zona de subida. */
  etiqueta: string;
  maxBytes: number;
};

/** Documentos de pedidos (bucket documentos-pedidos). */
export const TIPOS_PEDIDOS: TiposArchivo = {
  mimes: ALLOWED_MIME_TYPES,
  extensiones: [".pdf", ".jpg", ".jpeg", ".png", ".xlsx"],
  etiqueta: "PDF, JPG, PNG o Excel",
  maxBytes: MAX_FILE_SIZE_BYTES,
};

/** Envíos, unidades, cobranza y logística (bucket documentos-movara). */
export const TIPOS_MOVARA: TiposArchivo = {
  mimes: ALLOWED_MIME_TYPES_MOVARA,
  extensiones: [".pdf", ".jpg", ".jpeg", ".png", ".xlsx", ".docx"],
  etiqueta: "PDF, JPG, PNG, Excel o Word",
  maxBytes: MAX_FILE_SIZE_BYTES_MOVARA,
};

const MB = 1024 * 1024;

/** "2,4 MB", "24 MB", "0,05 MB" — siempre en MB, con coma decimal. */
export function formatearMB(bytes: number): string {
  const mb = bytes / MB;
  const decimales = mb >= 10 ? 0 : mb >= 0.1 ? 1 : 2;
  const valor = Math.max(mb, 0.01);
  return `${valor.toLocaleString("es-AR", { maximumFractionDigits: decimales })} MB`;
}

function extension(nombre: string): string {
  const i = nombre.lastIndexOf(".");
  return i >= 0 ? nombre.slice(i).toLowerCase() : "";
}

/** Error para mostrar tal cual debajo de la zona de subida, o null si el
 * archivo se puede subir. */
export function errorDeArchivo(file: { name: string; size: number; type: string }, tipos: TiposArchivo): string | null {
  const tipoOk = file.type ? tipos.mimes.includes(file.type) : tipos.extensiones.includes(extension(file.name));
  if (!tipoOk) return `"${file.name}" no es un tipo de archivo permitido. Subí ${tipos.etiqueta}.`;
  if (file.size <= 0) return `"${file.name}" está vacío.`;
  if (file.size > tipos.maxBytes) {
    return `El archivo pesa ${formatearMB(file.size)}. El máximo es ${formatearMB(tipos.maxBytes)}.`;
  }
  return null;
}

/** Ícono de la tarjeta del archivo elegido. */
export function claseDeArchivo(file: { name: string; type: string }): "pdf" | "imagen" | "otro" {
  const ext = extension(file.name);
  if (file.type === "application/pdf" || ext === ".pdf") return "pdf";
  if (file.type.startsWith("image/") || [".jpg", ".jpeg", ".png"].includes(ext)) return "imagen";
  return "otro";
}
