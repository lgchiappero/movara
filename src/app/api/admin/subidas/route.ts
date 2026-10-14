import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminUser } from "@/lib/admin/current-user";
import { firmarSubida } from "@/lib/admin/subidas";
import { DESTINOS_SUBIDA, MAX_SUBIDA_BYTES } from "@/lib/admin/subidas-comun";

const pedidoSubidaSchema = z.object({
  destino: z.enum(DESTINOS_SUBIDA),
  entidadId: z.string().min(1).max(64).regex(/^[A-Za-z0-9_-]+$/),
  nombre: z.string().trim().min(1).max(200),
  tipo: z.string().min(1).max(200),
  tamano: z.number().int().positive().max(MAX_SUBIDA_BYTES, "El archivo supera el máximo de 20MB"),
});

/** Firma una subida directa del navegador a Storage (archivos de más de 4,5 MB).
 * Verifica la sesión del admin y valida tipo y tamaño antes de firmar. */
export async function POST(req: NextRequest) {
  const session = await getAdminUser();
  if (!session) {
    return NextResponse.json({ error: "Sesión inválida" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = pedidoSubidaSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
  }
  const { destino, entidadId, nombre, tipo, tamano } = parsed.data;

  const resultado = await firmarSubida(destino, entidadId, { nombre, tipo, tamano });
  if (!resultado.ok) {
    return NextResponse.json({ error: resultado.error }, { status: resultado.status });
  }
  return NextResponse.json(resultado.value);
}
