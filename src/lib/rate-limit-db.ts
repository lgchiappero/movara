import { createHmac } from "crypto";
import { db } from "@/lib/db";

/** Clave de rate limit para un valor identificatorio (IP, email). El valor
 * nunca se guarda en claro: se guarda su HMAC con AUTH_SECRET (un hash
 * simple de una IPv4 se revierte probando las ~4 mil millones de
 * direcciones). */
export function claveDe(scope: string, valor: string): string {
  const secret = process.env.AUTH_SECRET ?? "";
  return `${scope}:${createHmac("sha256", secret).update(valor).digest("hex")}`;
}

/** Clave de rate limit por IP (ver claveDe). */
export function claveIP(scope: string, ip: string): string {
  return claveDe(scope, ip);
}

/** Rate limit compartido entre instancias: vive en Postgres (tabla
 * rate_limit_hits), así funciona en Vercel, donde cada instancia tiene su
 * propia memoria. Consume un cupo si queda alguno en la ventana y devuelve
 * true; si no, devuelve false sin consumir. Antes borra los hits vencidos de
 * esa clave, así la tabla no crece sin límite. */
export async function consumirRateLimit(key: string, max: number, ventanaMs: number): Promise<boolean> {
  const usados = await contarHits(key, ventanaMs);
  if (usados >= max) return false;
  await registrarHit(key);
  return true;
}

/** Hits de la clave dentro de la ventana (borra antes los vencidos). Para
 * contar sin consumir, ej. intentos fallidos de login. */
export async function contarHits(key: string, ventanaMs: number): Promise<number> {
  const desde = new Date(Date.now() - ventanaMs);
  await db.rateLimitHit.deleteMany({ where: { key, createdAt: { lt: desde } } });
  return db.rateLimitHit.count({ where: { key, createdAt: { gte: desde } } });
}

export async function registrarHit(key: string): Promise<void> {
  await db.rateLimitHit.create({ data: { key } });
}

/** Borra todos los hits de la clave (ej. login correcto: se limpian los
 * fallos de esa IP y ese email). */
export async function borrarHits(key: string): Promise<void> {
  await db.rateLimitHit.deleteMany({ where: { key } });
}
