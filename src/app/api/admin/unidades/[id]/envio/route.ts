import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { unidadEnvioSchema } from "@/lib/validators/unidad";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = unidadEnvioSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", details: parsed.error.issues },
      { status: 400 }
    );
  }

  try {
    const unidad = await db.unidad.update({
      where: { id },
      data: { envioId: parsed.data.envioId },
    });
    return NextResponse.json({ ok: true, unidad });
  } catch (err) {
    console.error("[admin/unidades/:id/envio PATCH]", err);
    return NextResponse.json({ error: "Error al guardar" }, { status: 500 });
  }
}
