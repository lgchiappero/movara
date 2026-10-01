import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdminUser } from "@/lib/admin/current-user";
import { isAdmin } from "@/lib/admin/roles";
import { editarPlanSchema } from "@/lib/validators/cobranza";
import { estadoCuota } from "@/lib/cobranza/calc";
import { periodoEstaCerrado } from "@/lib/cobranza/periodo-cerrado";

// Tolerancia para comparar importes — misma que calc.ts.
const EPSILON = 0.01;

/** Edita un plan de pago: total acordado, descripción y cuotas (agregar,
 * modificar, eliminar). Una cuota con pagos aplicados no se puede
 * eliminar, ni bajar su importe por debajo de lo ya pagado. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const session = await getAdminUser();
  if (!session) {
    return NextResponse.json({ error: "Sesión inválida" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = editarPlanSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
  }
  const data = parsed.data;

  const acuerdo = await db.acuerdoPago.findUnique({
    where: { id },
    select: {
      id: true,
      cuotas: { select: { id: true, descripcion: true, movimientos: { select: { importe: true } } } },
    },
  });
  if (!acuerdo) {
    return NextResponse.json({ error: "Plan no encontrado" }, { status: 404 });
  }

  const aplicadoPorCuota = new Map(
    acuerdo.cuotas.map((c) => [c.id, c.movimientos.reduce((acc, m) => acc + m.importe, 0)])
  );

  const idsEnviados = new Set(data.cuotas.flatMap((c) => (c.id ? [c.id] : [])));
  const idAjeno = [...idsEnviados].find((cid) => !aplicadoPorCuota.has(cid));
  if (idAjeno) {
    return NextResponse.json({ error: "Una de las cuotas no pertenece a este plan" }, { status: 400 });
  }

  const aEliminar = acuerdo.cuotas.filter((c) => !idsEnviados.has(c.id));
  const conPagos = aEliminar.find((c) => (aplicadoPorCuota.get(c.id) ?? 0) > EPSILON);
  if (conPagos) {
    return NextResponse.json(
      { error: `No se puede eliminar la cuota "${conPagos.descripcion}": tiene pagos registrados` },
      { status: 400 }
    );
  }

  const pagadaDeMas = data.cuotas.find((c) => c.id && c.importe < (aplicadoPorCuota.get(c.id) ?? 0) - EPSILON);
  if (pagadaDeMas) {
    return NextResponse.json(
      { error: `El importe de "${pagadaDeMas.descripcion}" no puede ser menor a lo ya pagado` },
      { status: 400 }
    );
  }

  const ahora = new Date();
  await db.$transaction(async (tx) => {
    await tx.acuerdoPago.update({
      where: { id },
      data: {
        totalAcordado: data.totalAcordado,
        ...(data.descripcion !== undefined ? { descripcion: data.descripcion } : {}),
      },
    });
    if (aEliminar.length) {
      await tx.cuota.deleteMany({ where: { id: { in: aEliminar.map((c) => c.id) } } });
    }
    for (const c of data.cuotas) {
      const vencimiento = c.vencimiento ? new Date(c.vencimiento) : null;
      const estado = estadoCuota(c.importe, c.id ? (aplicadoPorCuota.get(c.id) ?? 0) : 0, vencimiento, ahora);
      if (c.id) {
        await tx.cuota.update({
          where: { id: c.id },
          data: { descripcion: c.descripcion, importe: c.importe, vencimiento, estado },
        });
      } else {
        await tx.cuota.create({
          data: { acuerdoId: id, descripcion: c.descripcion, importe: c.importe, vencimiento, estado },
        });
      }
    }
  });

  return NextResponse.json({ ok: true });
}

/** Elimina el plan completo: cuotas y pagos registrados caen en cascada
 * (onDelete: Cascade). Solo admin. No se puede si algún pago cae en un
 * período ya cerrado (los cierres son inmutables). */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const session = await getAdminUser();
  if (!session) {
    return NextResponse.json({ error: "Sesión inválida" }, { status: 401 });
  }
  if (!isAdmin(session.rol)) {
    return NextResponse.json({ error: "Solo un administrador puede eliminar" }, { status: 403 });
  }

  const acuerdo = await db.acuerdoPago.findUnique({
    where: { id },
    select: { id: true, movimientos: { select: { fecha: true } } },
  });
  if (!acuerdo) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  for (const m of acuerdo.movimientos) {
    if (await periodoEstaCerrado(m.fecha)) {
      return NextResponse.json(
        { error: "No se puede eliminar: tiene pagos en un período ya cerrado" },
        { status: 400 }
      );
    }
  }

  await db.acuerdoPago.delete({ where: { id } });
  return NextResponse.json({ ok: true, pagosEliminados: acuerdo.movimientos.length });
}
