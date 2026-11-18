/** IP del cliente para el rate limit. En Vercel, x-real-ip y el primer valor
 * de x-forwarded-for los pone la plataforma (no los puede inventar el
 * cliente). Sin ninguno (desarrollo, tests) se usa 127.0.0.1. */
export function ipCliente(req: Request): string {
  const real = req.headers.get("x-real-ip")?.trim();
  if (real) return real;
  const reenviada = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return reenviada || "127.0.0.1";
}
