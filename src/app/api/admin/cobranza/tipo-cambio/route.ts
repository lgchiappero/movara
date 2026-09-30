import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdminUser } from "@/lib/admin/current-user";
import { cargarTipoCambioSchema } from "@/lib/validators/cobranza";

export async function POST(req: NextRequest) {
  const session = await getAdminUser();
  if (!session) {
    return NextResponse.json({ error: "Sesión inválida" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const parsed = cargarTipoCambioSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
  }
  const data = parsed.data;

  const cotizacion = await db.tipoCambio.create({
    data: {
      fecha: new Date(data.fecha),
      usdArs: data.usdArs,
      fuente: data.fuente ?? null,
      cargadoPor: session.email,
    },
    select: { id: true },
  });

  return NextResponse.json({ ok: true, id: cotizacion.id }, { status: 201 });
}
