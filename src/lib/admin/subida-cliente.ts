import { campoSubido, MAX_SUBIDA_BYTES, UMBRAL_SUBIDA_DIRECTA_BYTES, type DestinoSubida } from "@/lib/admin/subidas-comun";

/** Error de la subida con un mensaje para mostrar tal cual en el formulario. */
export class ErrorSubida extends Error {}

/** Mensaje para el formulario: el de la subida si falló ahí, o el genérico. */
export function mensajeDeError(err: unknown, generico: string): string {
  return err instanceof ErrorSubida ? err.message : generico;
}

/** Recibe la fracción subida (0 a 1). */
export type AlProgresar = (fraccion: number) => void;

export type RespuestaSubida = { ok: boolean; status: number; json: Record<string, unknown> & { error?: string } };

/** Como fetch, pero informa el progreso de la subida del cuerpo (fetch no
 * puede). Un error de red rechaza con Error, igual que fetch. */
export function enviarConProgreso(
  url: string,
  { method, body, headers = {} }: { method: string; body: XMLHttpRequestBodyInit; headers?: Record<string, string> },
  alProgresar?: AlProgresar
): Promise<RespuestaSubida> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, url);
    for (const [k, v] of Object.entries(headers)) xhr.setRequestHeader(k, v);
    xhr.upload.onprogress = (e) => {
      if (alProgresar && e.lengthComputable && e.total > 0) alProgresar(e.loaded / e.total);
    };
    xhr.onload = () => {
      let json: RespuestaSubida["json"] = {};
      try {
        const parsed = JSON.parse(xhr.responseText);
        if (parsed && typeof parsed === "object") json = parsed;
      } catch {
        // Respuesta sin JSON (ej. el PUT a Storage): queda {}.
      }
      resolve({ ok: xhr.status >= 200 && xhr.status < 300, status: xhr.status, json });
    };
    xhr.onerror = () => reject(new Error("Error de red"));
    xhr.onabort = () => reject(new Error("Subida cancelada"));
    xhr.send(body);
  });
}

/** Agrega un archivo a un formulario del admin. Hasta 4 MB va en el mismo
 * formulario; si es más grande, el navegador lo sube directo a Storage con
 * una URL firmada y el formulario lleva solo la referencia. */
export async function adjuntarArchivo(
  form: FormData,
  campo: string,
  file: File,
  destino: DestinoSubida,
  entidadId: string,
  alProgresar?: AlProgresar
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

  const subida = await enviarConProgreso(
    json.signedUrl,
    { method: "PUT", headers: { "Content-Type": file.type || "application/octet-stream" }, body: file },
    alProgresar
  ).catch(() => ({ ok: false }));
  if (!subida.ok) throw new ErrorSubida("No pudimos subir el archivo. Probá de nuevo.");

  form.set(campoSubido(campo), JSON.stringify({ path: json.path, nombre: file.name }));
}

/** Envía un formulario del admin con sus archivos e informa el porcentaje
 * total (0 a 100), ponderado por el tamaño de cada archivo: primero las
 * subidas directas a Storage (más de 4 MB) y después el formulario. */
export async function enviarFormularioConArchivos({
  url,
  method = "POST",
  form,
  archivos,
  destino,
  entidadId,
  alProgresar,
}: {
  url: string;
  method?: string;
  form: FormData;
  archivos: { campo: string; file: File }[];
  destino: DestinoSubida;
  entidadId: string;
  alProgresar?: (porcentaje: number) => void;
}): Promise<RespuestaSubida> {
  const total = archivos.reduce((s, a) => s + a.file.size, 0);
  let ultimo = -1;
  const informar = (bytes: number) => {
    // Hasta 99 mientras sube: el 100 llega con la respuesta del servidor.
    const porcentaje = total > 0 ? Math.min(99, Math.floor((bytes / total) * 100)) : 0;
    if (porcentaje > ultimo) {
      ultimo = porcentaje;
      alProgresar?.(porcentaje);
    }
  };
  informar(0);

  let hechos = 0;
  let enFormulario = 0;
  for (const { campo, file } of archivos) {
    const base = hechos;
    await adjuntarArchivo(form, campo, file, destino, entidadId, (f) => informar(base + f * file.size));
    if (form.has(campoSubido(campo))) hechos += file.size;
    else enFormulario += file.size;
  }

  const base = hechos;
  const res = await enviarConProgreso(url, { method, body: form }, (f) => informar(base + f * enFormulario));
  if (res.ok) alProgresar?.(100);
  return res;
}
