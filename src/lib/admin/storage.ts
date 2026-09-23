import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

const SIGNED_URL_TTL_SECONDS = 300; // 5 minutos

export const BUCKET_PEDIDOS = "documentos-pedidos";
export const BUCKET_MOVARA = "documentos-movara"; // envíos y unidades

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
 * firmada, y evita colisiones entre documentos de distintas entidades.
 * `scope` agrupa por tipo de entidad (ej. "pedidos", "envios", "unidades"). */
export function buildStoragePath(scope: string, id: string, filename: string): string {
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-100);
  return `${scope}/${id}/${randomUUID()}-${safeName}`;
}

export async function uploadDocument(
  bucket: string,
  path: string,
  bytes: ArrayBuffer,
  contentType: string
): Promise<void> {
  const client = getStorageClient();
  const { error } = await client.storage.from(bucket).upload(path, bytes, {
    contentType,
    upsert: false,
  });
  if (error) throw new Error(`[storage] Error al subir: ${error.message}`);
}

/** URL firmada de corta duración — nunca se persiste, se genera de nuevo en
 * cada request que necesite mostrar el link "ver/descargar". */
export async function getSignedUrl(
  bucket: string,
  path: string,
  expiresInSeconds = SIGNED_URL_TTL_SECONDS
): Promise<string | null> {
  const client = getStorageClient();
  const { data, error } = await client.storage.from(bucket).createSignedUrl(path, expiresInSeconds);
  if (error || !data) {
    console.error("[storage] Error al firmar URL:", error?.message);
    return null;
  }
  return data.signedUrl;
}
