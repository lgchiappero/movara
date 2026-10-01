import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdminUser } from "@/lib/admin/current-user";
import { isAdmin } from "@/lib/admin/roles";
import { periodoEstaCerrado } from "@/lib/cobranza/periodo-cerrado";
import { leerCostoLogistica } from "@/lib/cobranza/costo-logistica-form";
import { subirComprobante } from "@/lib/cobranza/comprobante";
import { prorratear } from "@/lib/cobranza/logistica";

const PERIODO_CERRADO = "Ese período ya está cerrado — no se pueden modificar pagos con esa fecha";

/** Edición de un costo de logística. El prorrateo se recalcula siempre con
 * las unidades actuales del envío (o se borra si se desmarca). */
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
  const leido = leerCostoLogistica(form);
  if (!leido.ok) {
    return NextResponse.json({ error: leido.error }, { status: leido.status });
  }
  const { data, comprobante } = leido.value;

  const costo = await db.costoLogistica.findUnique({
    where: { id },
    select: {
      id: true,
      envioId: true,
      fecha: true,
      estado: true,
      comprobanteUrl: true,
      envio: { select: { unidades: { select: { id: true }, orderBy: { createdAt: "asc" } } } },
    },
  });
  if (!costo) {
    return NextResponse.json({ error: "Costo no encontrado" }, { status: 404 });
  }
  const unidadIds = costo.envio.unidades.map((u) => u.id);
  if (data.prorratear && unidadIds.length === 0) {
    return NextResponse.json({ error: "El envío no tiene unidades para prorratear el costo" }, { status: 400 });
  }

  const fecha = new Date(data.fecha);
  if (
    (costo.estado === "pagado" && (await periodoEstaCerrado(costo.fecha))) ||
    (data.estado === "pagado" && (await periodoEstaCerrado(fecha)))
  ) {
    return NextResponse.json({ error: PERIODO_CERRADO }, { status: 400 });
  }

  // Pasar a pendiente quita el comprobante; uno nuevo reemplaza al anterior.
  let comprobanteUrl = data.estado === "pagado" ? costo.comprobanteUrl : null;
  if (comprobante) {
    const subida = await subirComprobante(comprobante, "logistica", costo.envioId);
    if (!subida.ok) return NextResponse.json({ error: subida.error }, { status: subida.status });
    comprobanteUrl = subida.value;
  }

  await db.$transaction(async (tx) => {
    await tx.costoLogistica.update({
      where: { id },
      data: {
        concepto: data.concepto,
        descripcion: data.descripcion ?? null,
        moneda: data.moneda,
        importe: data.importe,
        fecha,
        estado: data.estado,
        comprobanteUrl,
        notas: data.notas ?? null,
        prorrateado: data.prorratear,
      },
    });
    await tx.prorrateoLogistica.deleteMany({ where: { costoId: id } });
    if (data.prorratear) {
      await tx.prorrateoLogistica.createMany({
        data: prorratear(data.importe, unidadIds).map((p) => ({ costoId: id, ...p })),
      });
    }
  });

  return NextResponse.json({ ok: true });
}

/** Elimina el costo (y su prorrateo, en cascada). Solo admin. */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const session = await getAdminUser();
  if (!session) {
    return NextResponse.json({ error: "Sesión inválida" }, { status: 401 });
  }
  if (!isAdmin(session.rol)) {
    return NextResponse.json({ error: "Solo un administrador puede eliminar" }, { status: 403 });
  }

  const costo = await db.costoLogistica.findUnique({ where: { id }, select: { fecha: true, estado: true } });
  if (!costo) {
    return NextResponse.json({ error: "Costo no encontrado" }, { status: 404 });
  }
  if (costo.estado === "pagado" && (await periodoEstaCerrado(costo.fecha))) {
    return NextResponse.json({ error: "No se puede eliminar: el pago es de un período ya cerrado" }, { status: 400 });
  }

  await db.costoLogistica.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
