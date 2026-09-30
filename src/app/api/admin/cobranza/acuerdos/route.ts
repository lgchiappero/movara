import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdminUser } from "@/lib/admin/current-user";
import { crearAcuerdoSchema } from "@/lib/validators/cobranza";

export async function POST(req: NextRequest) {
  const session = await getAdminUser();
  if (!session) {
    return NextResponse.json({ error: "Sesión inválida" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const parsed = crearAcuerdoSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
  }
  const data = parsed.data;

  const unidad = await db.unidad.findUnique({ where: { id: data.unidadId }, select: { id: true } });
  if (!unidad) {
    return NextResponse.json({ error: "Unidad no encontrada" }, { status: 404 });
  }

  const acuerdo = await db.acuerdoPago.create({
    data: {
      unidadId: data.unidadId,
      tipo: data.tipo,
      concepto: data.concepto,
      descripcion: data.descripcion ?? null,
      contraparte: data.contraparte,
      moneda: data.moneda,
      totalAcordado: data.totalAcordado,
      notas: data.notas ?? null,
      registradoPor: session.email,
      cuotas: {
        create: data.cuotas.map((c) => ({
          descripcion: c.descripcion,
          importe: c.importe,
          vencimiento: c.vencimiento ? new Date(c.vencimiento) : null,
        })),
      },
    },
    select: { id: true },
  });

  return NextResponse.json({ ok: true, id: acuerdo.id }, { status: 201 });
}
