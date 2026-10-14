import { db } from "@/lib/db";
import { validateFile, validateFileMovara, type FileValidationResult } from "@/lib/admin/file-validation";
import {
  BUCKET_MOVARA,
  BUCKET_PEDIDOS,
  buildStoragePath,
  crearUrlSubida,
  eliminarArchivo,
  infoArchivo,
  uploadDocument,
} from "@/lib/admin/storage";
import { campoSubido, type DestinoSubida } from "@/lib/admin/subidas-comun";

type Resultado<T> = { ok: true; value: T } | { ok: false; error: string; status: number };

type ConfigDestino = {
  bucket: string;
  /** Carpeta dentro del bucket (la primera parte del path). */
  scope: string;
  validar: (archivo: { size: number; type: string }) => FileValidationResult;
  existe: (id: string) => Promise<boolean>;
};

export const CONFIG_DESTINOS: Record<DestinoSubida, ConfigDestino> = {
  pedidos: {
    bucket: BUCKET_PEDIDOS,
    scope: "pedidos",
    validar: validateFile,
    existe: async (id) => !!(await db.configuracionPedido.findUnique({ where: { id }, select: { id: true } })),
  },
  envios: {
    bucket: BUCKET_MOVARA,
    scope: "envios",
    validar: validateFileMovara,
    existe: async (id) => !!(await db.envio.findUnique({ where: { id }, select: { id: true } })),
  },
  unidades: {
    bucket: BUCKET_MOVARA,
    scope: "unidades",
    validar: validateFileMovara,
    existe: async (id) => !!(await db.unidad.findUnique({ where: { id }, select: { id: true } })),
  },
  cobranza: {
    bucket: BUCKET_MOVARA,
    scope: "cobranza",
    validar: validateFileMovara,
    existe: async (id) => !!(await db.acuerdoPago.findUnique({ where: { id }, select: { id: true } })),
  },
  logistica: {
    bucket: BUCKET_MOVARA,
    scope: "logistica",
    validar: validateFileMovara,
    existe: async (id) => !!(await db.envio.findUnique({ where: { id }, select: { id: true } })),
  },
};

/** Valida tipo y tamaño declarados, verifica la entidad y firma la subida. */
export async function firmarSubida(
  destino: DestinoSubida,
  entidadId: string,
  archivo: { nombre: string; tipo: string; tamano: number }
): Promise<Resultado<{ path: string; signedUrl: string }>> {
  const config = CONFIG_DESTINOS[destino];
  const validacion = config.validar({ size: archivo.tamano, type: archivo.tipo });
  if (!validacion.valid) return { ok: false, error: validacion.error, status: 400 };
  if (!(await config.existe(entidadId))) return { ok: false, error: "No encontrado", status: 404 };

  const path = buildStoragePath(config.scope, entidadId, archivo.nombre);
  try {
    return { ok: true, value: { path, signedUrl: await crearUrlSubida(config.bucket, path) } };
  } catch (err) {
    console.error("[subidas]", err instanceof Error ? err.message : "error");
    return { ok: false, error: "No pudimos preparar la subida", status: 500 };
  }
}

/** Verifica un archivo subido directo: que sea de esta entidad, que exista y
 * que su tamaño y tipo reales pasen la validación. Si no pasa, se borra. */
export async function verificarSubida(
  destino: DestinoSubida,
  entidadId: string,
  path: string
): Promise<Resultado<{ path: string; tipo: string; tamano: number }>> {
  const config = CONFIG_DESTINOS[destino];
  const prefijo = `${config.scope}/${entidadId}/`;
  if (!path.startsWith(prefijo) || path.includes("..") || path.length > 400) {
    return { ok: false, error: "Archivo inválido", status: 400 };
  }
  const info = await infoArchivo(config.bucket, path);
  if (!info) return { ok: false, error: "No encontramos el archivo subido. Probá de nuevo.", status: 400 };
  const validacion = config.validar({ size: info.tamano, type: info.tipo });
  if (!validacion.valid) {
    await eliminarArchivo(config.bucket, path);
    return { ok: false, error: validacion.error, status: 400 };
  }
  return { ok: true, value: { path, tipo: info.tipo, tamano: info.tamano } };
}

export type ArchivoDelFormulario = { path: string; nombre: string; tipo: string };

/** Archivo de un formulario del admin, venga como archivo (hasta 4,5 MB) o
 * como referencia a una subida directa a Storage (`<campo>Subido`). Devuelve
 * null si el formulario no trae ninguno. */
export async function archivoDelFormulario(
  form: FormData,
  campo: string,
  destino: DestinoSubida,
  entidadId: string,
  mensajeErrorSubida = "No pudimos subir el archivo"
): Promise<Resultado<ArchivoDelFormulario | null>> {
  const config = CONFIG_DESTINOS[destino];
  const file = form.get(campo);
  if (file instanceof File && file.size > 0) {
    const validacion = config.validar({ size: file.size, type: file.type });
    if (!validacion.valid) return { ok: false, error: validacion.error, status: 400 };
    const path = buildStoragePath(config.scope, entidadId, file.name);
    try {
      await uploadDocument(config.bucket, path, await file.arrayBuffer(), file.type);
    } catch (err) {
      console.error(`[subidas] ${destino}`, err instanceof Error ? err.message : "error");
      return { ok: false, error: mensajeErrorSubida, status: 500 };
    }
    return { ok: true, value: { path, nombre: file.name, tipo: file.type } };
  }

  const subido = form.get(campoSubido(campo));
  if (typeof subido !== "string" || !subido) return { ok: true, value: null };
  let ref: { path?: unknown; nombre?: unknown };
  try {
    ref = JSON.parse(subido);
  } catch {
    return { ok: false, error: "Archivo inválido", status: 400 };
  }
  if (typeof ref.path !== "string" || typeof ref.nombre !== "string") {
    return { ok: false, error: "Archivo inválido", status: 400 };
  }
  const verificado = await verificarSubida(destino, entidadId, ref.path);
  if (!verificado.ok) return verificado;
  const nombre = ref.nombre.trim().slice(0, 200) || ref.path.split("/").pop()!;
  return { ok: true, value: { path: verificado.value.path, nombre, tipo: verificado.value.tipo } };
}
