import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { unidadEditSchema } from "@/lib/validators/unidad";
import { calcularGarantiaFechaFin } from "@/lib/pedido/garantia";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = unidadEditSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", details: parsed.error.issues },
      { status: 400 }
    );
  }
  const data = parsed.data;
  const garantiaFin = calcularGarantiaFechaFin(data.garantiaInicio);

  try {
    const unidad = await db.unidad.update({
      where: { id },
      data: {
        ...data,
        // Json? nullable requiere Prisma.JsonNull explícito para "poner en
        // NULL" — un `null` de JS a secas ahí es ambiguo para Prisma.
        configuracion:
          data.configuracion === null ? Prisma.JsonNull : (data.configuracion as Prisma.InputJsonValue),
        garantiaFin,
      },
    });
    return NextResponse.json({ ok: true, unidad });
  } catch (err) {
    console.error("[admin/unidades/:id PATCH]", err);
    return NextResponse.json({ error: "Error al guardar" }, { status: 500 });
  }
}
