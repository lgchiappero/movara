import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdminUser } from "@/lib/admin/current-user";
import { cerrarPeriodoSchema } from "@/lib/validators/cobranza";

export async function POST(req: NextRequest) {
  const session = await getAdminUser();
  if (!session) {
    return NextResponse.json({ error: "Sesión inválida" }, { status: 401 });
  }
  if (session.rol !== "admin") {
    return NextResponse.json({ error: "Solo un admin puede cerrar un período" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const parsed = cerrarPeriodoSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
  }
  const { mes, anio, notas } = parsed.data;

  const desde = new Date(anio, mes - 1, 1);
  const hasta = new Date(anio, mes, 1);
  if (hasta.getTime() > Date.now()) {
    return NextResponse.json({ error: "Todavía no se puede cerrar un mes que no terminó" }, { status: 400 });
  }

  const yaExiste = await db.cierrePeriodo.findUnique({ where: { mes_anio: { mes, anio } } });
  if (yaExiste) {
    return NextResponse.json({ error: "Ese período ya está cerrado" }, { status: 409 });
  }

  const movimientos = await db.movimiento.findMany({
    where: { fecha: { gte: desde, lt: hasta } },
    select: { importe: true, acuerdo: { select: { tipo: true, moneda: true } } },
  });

  let totalCobradoUSD = 0;
  let totalCobradoARS = 0;
  let totalPagadoUSD = 0;
  let totalPagadoARS = 0;
  for (const m of movimientos) {
    if (m.acuerdo.tipo === "cobro" && m.acuerdo.moneda === "USD") totalCobradoUSD += m.importe;
    else if (m.acuerdo.tipo === "cobro" && m.acuerdo.moneda === "ARS") totalCobradoARS += m.importe;
    else if (m.acuerdo.tipo === "pago" && m.acuerdo.moneda === "USD") totalPagadoUSD += m.importe;
    else if (m.acuerdo.tipo === "pago" && m.acuerdo.moneda === "ARS") totalPagadoARS += m.importe;
  }

  const cierre = await db.cierrePeriodo.create({
    data: {
      mes,
      anio,
      cerradoPor: session.email,
      notas: notas ?? null,
      totalCobradoUSD,
      totalCobradoARS,
      totalPagadoUSD,
      totalPagadoARS,
      margenUSD: totalCobradoUSD - totalPagadoUSD,
    },
    select: { id: true },
  });

  return NextResponse.json({ ok: true, id: cierre.id }, { status: 201 });
}
