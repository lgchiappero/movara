import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { leadCreateSchema } from "@/lib/validators/lead";

/** Alta manual de un lead desde el botón "Nuevo lead" de /admin/pipeline —
 * distinto del formulario público (src/app/api/leads/route.ts). Siempre
 * entra en etapa "nuevo"; no es seleccionable desde el form. */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const parsed = leadCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Datos inválidos", details: parsed.error.issues },
      { status: 400 }
    );
  }
  const data = parsed.data;

  try {
    const lead = await db.lead.create({
      data: {
        nombre: data.nombre,
        email: data.email,
        telefono: data.telefono,
        origen: data.origen,
        modeloInteres: data.modeloInteres,
        notasVenta: data.notasVenta,
        vendedorId: data.vendedorId,
        valorEstimado: data.valorEstimado,
        etapa: "nuevo",
      },
      select: { id: true },
    });
    return NextResponse.json({ ok: true, id: lead.id }, { status: 201 });
  } catch (err) {
    console.error("[admin/leads POST]", err);
    return NextResponse.json({ error: "Error al guardar" }, { status: 500 });
  }
}
