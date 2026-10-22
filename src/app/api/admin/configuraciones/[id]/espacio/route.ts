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
    // El form solo edita los materiales de texto libre: el resto de lo que
    // eligió el cliente (balcón, techo, muro cortina, extras con costo...) se
    // conserva tal cual.
    const actual = await db.configuracionPedido.findUnique({ where: { id }, select: { materiales: true } });
    if (!actual) return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
    const materialesActuales =
      actual.materiales && typeof actual.materiales === "object" && !Array.isArray(actual.materiales)
        ? (actual.materiales as Record<string, unknown>)
        : {};

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
        materiales: { ...materialesActuales, ...data.materiales },
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
