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
