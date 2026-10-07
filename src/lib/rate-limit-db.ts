import { createHmac } from "crypto";
import { db } from "@/lib/db";

/** Clave de rate limit por IP. La IP nunca se guarda en claro: se guarda su
 * HMAC con AUTH_SECRET (un hash simple de IPv4 se revierte probando las ~4
 * mil millones de direcciones). */
export function claveIP(scope: string, ip: string): string {
  const secret = process.env.AUTH_SECRET ?? "";
  return `${scope}:${createHmac("sha256", secret).update(ip).digest("hex")}`;
}

/** Rate limit compartido entre instancias — vive en Postgres, a diferencia
 * del de src/lib/rate-limit.ts, que es en memoria y por instancia (en
 * Vercel casi no limita). Consume un cupo si queda alguno en la ventana y
 * devuelve true; si no, devuelve false sin consumir. Antes borra los hits
 * vencidos de esa clave, así la tabla no crece sin límite. */
export async function consumirRateLimit(key: string, max: number, ventanaMs: number): Promise<boolean> {
  const desde = new Date(Date.now() - ventanaMs);
  await db.rateLimitHit.deleteMany({ where: { key, createdAt: { lt: desde } } });
  const usados = await db.rateLimitHit.count({ where: { key, createdAt: { gte: desde } } });
  if (usados >= max) return false;
  await db.rateLimitHit.create({ data: { key } });
  return true;
}
