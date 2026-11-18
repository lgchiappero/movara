import { createHash, timingSafeEqual } from "crypto";

/** Compara dos secretos en tiempo constante: no deja medir por el tiempo de
 * respuesta cuántos caracteres coinciden. Se comparan los hashes, que tienen
 * siempre el mismo largo (timingSafeEqual exige largos iguales y fallaría,
 * revelando el largo del secreto). */
export function igualSeguro(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}
