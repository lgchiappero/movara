import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { disponibilidadDiaSchema } from "@/lib/validators/admin-agenda";
import { fechaKeyToDate } from "@/lib/agenda/fecha";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = disponibilidadDiaSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }
  const { fecha: fechaKey, habilitada, horarios } = parsed.data;
  const fecha = fechaKeyToDate(fechaKey);

  const dia = await db.disponibilidadAgenda.upsert({
    where: { fecha },
    update: { habilitada, horarios },
    create: { fecha, habilitada, horarios },
  });

  return NextResponse.json({ ok: true, dia });
}
