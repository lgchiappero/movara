import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

const BUCKET = "documentos-pedidos";
const SIGNED_URL_TTL_SECONDS = 300; // 5 minutos

function getStorageClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("[storage] SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY no configurados");
  }
  // Service role — server-only, nunca debe llegar al cliente. Sin
  // persistSession porque este cliente no representa a un usuario logueado
  // de Supabase, es un cliente de servicio de un solo uso por request.
  return createClient(url, key, { auth: { persistSession: false } });
}

/** Path único dentro del bucket — no expone el nombre original en la URL
 * firmada, y evita colisiones entre documentos de distintos pedidos. */
export function buildStoragePath(pedidoId: string, filename: string): string {
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-100);
  return `pedidos/${pedidoId}/${randomUUID()}-${safeName}`;
}

export async function uploadDocument(
  path: string,
  bytes: ArrayBuffer,
  contentType: string
): Promise<void> {
  const client = getStorageClient();
  const { error } = await client.storage.from(BUCKET).upload(path, bytes, {
    contentType,
    upsert: false,
  });
  if (error) throw new Error(`[storage] Error al subir: ${error.message}`);
}

/** URL firmada de corta duración — nunca se persiste, se genera de nuevo en
 * cada request que necesite mostrar el link "ver/descargar". */
export async function getSignedUrl(
  path: string,
  expiresInSeconds = SIGNED_URL_TTL_SECONDS
): Promise<string | null> {
  const client = getStorageClient();
  const { data, error } = await client.storage.from(BUCKET).createSignedUrl(path, expiresInSeconds);
  if (error || !data) {
    console.error("[storage] Error al firmar URL:", error?.message);
    return null;
  }
  return data.signedUrl;
}
