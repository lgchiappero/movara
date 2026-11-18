import { NextResponse } from "next/server";
import type { ZodType } from "zod";
import { leerJsonLimitado } from "@/lib/seguridad/publico";

/** Tamaño máximo del body de las rutas del panel del bot. */
export const MAX_BODY_BOT = 16 * 1024;

type Lectura<T> = { ok: true; datos: T } | { ok: false; respuesta: NextResponse };

/** Lee el body con límite de tamaño y lo valida con el esquema: 413 si es
 * grande, 400 con el primer error si no valida. */
export async function leerYValidar<T>(req: Request, esquema: ZodType<T>): Promise<Lectura<T>> {
  const lectura = await leerJsonLimitado(req, MAX_BODY_BOT);
  if (!lectura.ok) return lectura;
  const parsed = esquema.safeParse(lectura.datos);
  if (!parsed.success) {
    return {
      ok: false,
      // Un rechazo de Zod trae siempre al menos un error: se muestra el primero.
      respuesta: NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 }),
    };
  }
  return { ok: true, datos: parsed.data };
}

/** Prisma P2002 (único repetido) y P2025 (no existe). */
export function codigoPrisma(err: unknown): string | null {
  return typeof err === "object" && err !== null && "code" in err && typeof err.code === "string" ? err.code : null;
}
