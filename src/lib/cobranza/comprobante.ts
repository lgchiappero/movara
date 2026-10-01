import { validateFileMovara } from "@/lib/admin/file-validation";
import { buildStoragePath, uploadDocument, BUCKET_MOVARA } from "@/lib/admin/storage";

type Resultado<T> = { ok: true; value: T } | { ok: false; error: string; status: number };

/** Valida y sube un comprobante a Storage; devuelve su path. */
export async function subirComprobante(file: File, scope: string, carpetaId: string): Promise<Resultado<string>> {
  const validation = validateFileMovara({ size: file.size, type: file.type });
  if (!validation.valid) return { ok: false, error: validation.error ?? "Archivo inválido", status: 400 };
  const path = buildStoragePath(scope, carpetaId, file.name);
  try {
    await uploadDocument(BUCKET_MOVARA, path, await file.arrayBuffer(), file.type);
  } catch (err) {
    console.error("[comprobante]", err);
    return { ok: false, error: "No pudimos subir el comprobante", status: 500 };
  }
  return { ok: true, value: path };
}
