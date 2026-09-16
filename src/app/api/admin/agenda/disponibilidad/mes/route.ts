import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { habilitarMesSchema } from "@/lib/validators/admin-agenda";
import { HORARIOS_AGENDA, esDiaHabil } from "@/lib/agenda/horarios";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = habilitarMesSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }
  const { anio, mes } = parsed.data;
  const diasEnMes = new Date(Date.UTC(anio, mes, 0)).getUTCDate();

  const fechasHabiles: Date[] = [];
  for (let d = 1; d <= diasEnMes; d++) {
    const fecha = new Date(Date.UTC(anio, mes - 1, d));
    if (esDiaHabil(fecha)) fechasHabiles.push(fecha);
  }

  await db.$transaction(
    fechasHabiles.map((fecha) =>
      db.disponibilidadAgenda.upsert({
        where: { fecha },
        update: { habilitada: true, horarios: [...HORARIOS_AGENDA] },
        create: { fecha, habilitada: true, horarios: [...HORARIOS_AGENDA] },
      })
    )
  );

  return NextResponse.json({ ok: true, dias: fechasHabiles.length });
}
