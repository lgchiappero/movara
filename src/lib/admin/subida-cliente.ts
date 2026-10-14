import { campoSubido, MAX_SUBIDA_BYTES, UMBRAL_SUBIDA_DIRECTA_BYTES, type DestinoSubida } from "@/lib/admin/subidas-comun";

/** Error de la subida con un mensaje para mostrar tal cual en el formulario. */
export class ErrorSubida extends Error {}

/** Mensaje para el formulario: el de la subida si falló ahí, o el genérico. */
export function mensajeDeError(err: unknown, generico: string): string {
  return err instanceof ErrorSubida ? err.message : generico;
}

/** Agrega un archivo a un formulario del admin. Hasta 4 MB va en el mismo
 * formulario; si es más grande, el navegador lo sube directo a Storage con
 * una URL firmada y el formulario lleva solo la referencia. */
export async function adjuntarArchivo(
  form: FormData,
  campo: string,
  file: File,
  destino: DestinoSubida,
  entidadId: string
): Promise<void> {
  if (file.size > MAX_SUBIDA_BYTES) throw new ErrorSubida("El archivo supera el máximo de 20MB");
  if (file.size <= UMBRAL_SUBIDA_DIRECTA_BYTES) {
    form.set(campo, file);
    return;
  }

  const res = await fetch("/api/admin/subidas", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ destino, entidadId, nombre: file.name, tipo: file.type, tamano: file.size }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || typeof json.signedUrl !== "string" || typeof json.path !== "string") {
    throw new ErrorSubida(json.error ?? "No pudimos preparar la subida del archivo.");
  }

  const subida = await fetch(json.signedUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type || "application/octet-stream" },
    body: file,
  });
  if (!subida.ok) throw new ErrorSubida("No pudimos subir el archivo. Probá de nuevo.");

  form.set(campoSubido(campo), JSON.stringify({ path: json.path, nombre: file.name }));
}
