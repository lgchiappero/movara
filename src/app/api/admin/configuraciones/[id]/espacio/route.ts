import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { configuracionEspacioSchema } from "@/lib/validators/admin-pedido-espacio";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const body = await req.json().catch(() => null);
  const parsed = configuracionEspacioSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", details: parsed.error.issues },
      { status: 400 }
    );
  }
  const data = parsed.data;

  try {
    const config = await db.configuracionPedido.update({
      where: { id },
      data: {
        modelo: data.modelo,
        finalidad: data.finalidad,
        provincia: data.provincia,
        localidad: data.localidad,
        habitaciones: data.habitaciones,
        incluyeCocina: data.incluyeCocina,
        tipoCocina: data.tipoCocina,
        incluyeBano: data.incluyeBano,
        tipoAgua: data.tipoAgua,
        lavarropas: data.lavarropas,
        materiales: data.materiales,
        upgrades: data.upgrades,
        notasConfiguracion: data.notasConfiguracion,
      },
    });

    return NextResponse.json({ ok: true, config });
  } catch (err) {
    console.error("[admin/configuraciones/:id/espacio PATCH]", err);
    return NextResponse.json({ error: "Error al guardar" }, { status: 500 });
  }
}
