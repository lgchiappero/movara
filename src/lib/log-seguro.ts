/** Resumen de un error apto para los logs de rutas públicas: solo el tipo y
 * el código. Nunca el mensaje completo — los errores de validación de
 * Prisma, por ejemplo, incluyen los argumentos de la consulta (nombre, DNI,
 * email, teléfono del usuario). */
export function resumenError(err: unknown): string {
  if (err && typeof err === "object") {
    const e = err as { name?: unknown; code?: unknown };
    const nombre = typeof e.name === "string" && e.name ? e.name : "Error";
    return typeof e.code === "string" || typeof e.code === "number" ? `${nombre} (${e.code})` : nombre;
  }
  return typeof err;
}
