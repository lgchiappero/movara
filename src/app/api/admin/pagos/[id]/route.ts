import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdminUser } from "@/lib/admin/current-user";
import { estadoCuota } from "@/lib/cobranza/calc";
import { CONCEPTO_LABELS } from "@/lib/cobranza/constantes";
import { periodoEstaCerrado } from "@/lib/cobranza/periodo-cerrado";
import { leerPagoProveedor, subirComprobante } from "@/lib/cobranza/pago-proveedor-form";

/** Edición de un pago directo a proveedor. Pasar de pendiente a pagado crea
 * el movimiento; de pagado a pendiente lo borra. Eliminar un pago se hace
 * con DELETE /api/admin/cobranza/acuerdos/[id] (cae todo en cascada). */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const session = await getAdminUser();
  if (!session) {
    return NextResponse.json({ error: "Sesión inválida" }, { status: 401 });
  }

  const form = await req.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ error: "Formulario inválido" }, { status: 400 });
  }
  const leido = leerPagoProveedor(form);
  if (!leido.ok) {
    return NextResponse.json({ error: leido.error }, { status: leido.status });
  }
  const { data, comprobante } = leido.value;

  const acuerdo = await db.acuerdoPago.findUnique({
    where: { id },
    select: {
      id: true,
      tipo: true,
      unidadId: true,
      cuotas: { select: { id: true } },
      movimientos: { select: { id: true, fecha: true, comprobanteUrl: true } },
    },
  });
  if (!acuerdo || acuerdo.tipo !== "pago") {
    return NextResponse.json({ error: "Pago no encontrado" }, { status: 404 });
  }
  if (acuerdo.cuotas.length > 1 || acuerdo.movimientos.length > 1) {
    return NextResponse.json(
      { error: "Este pago tiene varias cuotas (formato anterior) — no se puede editar como pago directo" },
      { status: 400 }
    );
  }

  const fecha = new Date(data.fecha);
  const pagado = data.estado === "pagado";
  const movimientoActual = acuerdo.movimientos[0] ?? null;
  if (
    (movimientoActual && (await periodoEstaCerrado(movimientoActual.fecha))) ||
    (pagado && (await periodoEstaCerrado(fecha)))
  ) {
    return NextResponse.json(
      { error: "Ese período ya está cerrado — no se pueden modificar pagos con esa fecha" },
      { status: 400 }
    );
  }

  let comprobanteUrl = movimientoActual?.comprobanteUrl ?? null;
  if (comprobante) {
    const subida = await subirComprobante(comprobante, acuerdo.unidadId);
    if (!subida.ok) return NextResponse.json({ error: subida.error }, { status: subida.status });
    comprobanteUrl = subida.value;
  }

  await db.$transaction(async (tx) => {
    await tx.acuerdoPago.update({
      where: { id },
      data: {
        concepto: data.concepto,
        descripcion: data.descripcion ?? null,
        contraparte: data.proveedor,
        moneda: data.moneda,
        totalAcordado: data.importe,
        notas: data.notas ?? null,
      },
    });

    const cuotaData = {
      descripcion: data.descripcion || CONCEPTO_LABELS[data.concepto],
      importe: data.importe,
      vencimiento: fecha,
      estado: pagado ? "pagado" : estadoCuota(data.importe, 0, fecha, new Date()),
    };
    const cuotaId = acuerdo.cuotas[0]
      ? (await tx.cuota.update({ where: { id: acuerdo.cuotas[0].id }, data: cuotaData, select: { id: true } })).id
      : (await tx.cuota.create({ data: { acuerdoId: id, ...cuotaData }, select: { id: true } })).id;

    const movimientoData = {
      cuotaId,
      fecha,
      importe: data.importe,
      modalidad: data.modalidad,
      comprobanteUrl,
      notas: data.notas ?? null,
    };
    if (pagado && movimientoActual) {
      await tx.movimiento.update({ where: { id: movimientoActual.id }, data: movimientoData });
    } else if (pagado) {
      await tx.movimiento.create({ data: { acuerdoId: id, registradoPor: session.email, ...movimientoData } });
    } else if (movimientoActual) {
      await tx.movimiento.delete({ where: { id: movimientoActual.id } });
    }
  });

  return NextResponse.json({ ok: true });
}
