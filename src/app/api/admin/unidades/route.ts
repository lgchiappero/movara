import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { nuevaUnidadSchema } from "@/lib/validators/unidad";
import { generateNumeroUnidad } from "@/lib/envios/numero-unidad";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = nuevaUnidadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", details: parsed.error.issues },
      { status: 400 }
    );
  }
  const data = parsed.data;

  try {
    const unidad = await db.$transaction(async (tx) => {
      const numeroUnidad = await generateNumeroUnidad(tx);
      return tx.unidad.create({
        data: {
          numeroUnidad,
          clienteId: data.clienteId,
          envioId: data.envioId ?? null,
          modelo: data.modelo ?? null,
          precioCliente: data.precioCliente ?? null,
          notas: data.notas ?? null,
        },
      });
    });

    return NextResponse.json({ ok: true, id: unidad.id }, { status: 201 });
  } catch (err) {
    console.error("[admin/unidades POST]", err);
    return NextResponse.json({ error: "Error al crear la unidad" }, { status: 500 });
  }
}
