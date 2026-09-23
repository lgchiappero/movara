export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

export const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
] as const;

export type FileValidationResult = { valid: true } | { valid: false; error: string };

export function validateFile(file: { size: number; type: string }): FileValidationResult {
  if (file.size <= 0) {
    return { valid: false, error: "El archivo está vacío" };
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return { valid: false, error: "El archivo supera el máximo de 10MB" };
  }
  if (!ALLOWED_MIME_TYPES.includes(file.type as (typeof ALLOWED_MIME_TYPES)[number])) {
    return { valid: false, error: "Tipo de archivo no permitido — solo PDF, JPG, PNG o XLSX" };
  }
  return { valid: true };
}

// ─── Documentos de envíos/unidades (bucket "documentos-movara") ───────────
// Límite y tipos permitidos distintos a los de pedidos (20MB, suma DOCX) —
// por eso son constantes y una función aparte en vez de generalizar las de
// arriba con parámetros.
export const MAX_FILE_SIZE_BYTES_MOVARA = 20 * 1024 * 1024; // 20MB

export const ALLOWED_MIME_TYPES_MOVARA = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
] as const;

export function validateFileMovara(file: { size: number; type: string }): FileValidationResult {
  if (file.size <= 0) {
    return { valid: false, error: "El archivo está vacío" };
  }
  if (file.size > MAX_FILE_SIZE_BYTES_MOVARA) {
    return { valid: false, error: "El archivo supera el máximo de 20MB" };
  }
  if (!ALLOWED_MIME_TYPES_MOVARA.includes(file.type as (typeof ALLOWED_MIME_TYPES_MOVARA)[number])) {
    return { valid: false, error: "Tipo de archivo no permitido — solo PDF, JPG, PNG, XLSX o DOCX" };
  }
  return { valid: true };
}
