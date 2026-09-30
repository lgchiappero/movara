import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdminUser } from "@/lib/admin/current-user";
import { validateFileMovara } from "@/lib/admin/file-validation";
import { buildStoragePath, uploadDocument, BUCKET_MOVARA } from "@/lib/admin/storage";
import { registrarMovimientoSchema } from "@/lib/validators/cobranza";
import { periodoEstaCerrado } from "@/lib/cobranza/periodo-cerrado";
import { recalcularEstadoCuota } from "@/lib/cobranza/recalcular-cuota";

type Params = { id: string; movimientoId: string };

async function findMovimiento(acuerdoId: string, movimientoId: string) {
  const movimiento = await db.movimiento.findUnique({ where: { id: movimientoId } });
  if (!movimiento || movimiento.acuerdoId !== acuerdoId) return null;
  return movimiento;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<Params> }) {
  const { id: acuerdoId, movimientoId } = await params;

  const session = await getAdminUser();
  if (!session) {
    return NextResponse.json({ error: "Sesión inválida" }, { status: 401 });
  }

  const movimientoActual = await findMovimiento(acuerdoId, movimientoId);
  if (!movimientoActual) {
    return NextResponse.json({ error: "Pago no encontrado" }, { status: 404 });
  }

  // Un pago dentro de un período ya cerrado es inmutable — ni para
  // moverlo a otra fecha (chequeado más abajo) ni para editar cualquier
  // otro campo suyo.
  if (await periodoEstaCerrado(movimientoActual.fecha)) {
    return NextResponse.json(
      { error: "Ese período ya está cerrado — no se pueden modificar pagos con esa fecha" },
      { status: 400 }
    );
  }

  const form = await req.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ error: "Formulario inválido" }, { status: 400 });
  }

  const fecha = form.get("fecha");
  const importeRaw = form.get("importe");
  const cuotaIdRaw = form.get("cuotaId");
  const modalidad = form.get("modalidad");
  const notas = form.get("notas");
  const file = form.get("comprobante");

  const parsed = registrarMovimientoSchema.safeParse({
    fecha: typeof fecha === "string" ? fecha : "",
    importe: typeof importeRaw === "string" ? Number(importeRaw) : NaN,
    cuotaId: typeof cuotaIdRaw === "string" && cuotaIdRaw ? cuotaIdRaw : null,
    modalidad: typeof modalidad === "string" ? modalidad : "",
    notas: typeof notas === "string" ? notas : null,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
  }
  const data = parsed.data;

  const fechaNueva = new Date(data.fecha);
  if (fechaNueva.getTime() !== movimientoActual.fecha.getTime() && (await periodoEstaCerrado(fechaNueva))) {
    return NextResponse.json(
      { error: "No se puede mover el pago a un período ya cerrado" },
      { status: 400 }
    );
  }

  let cuotaNueva: { id: string; acuerdoId: string; importe: number; estado: string; vencimiento: Date | null } | null =
    null;
  if (data.cuotaId) {
    cuotaNueva = await db.cuota.findUnique({ where: { id: data.cuotaId } });
    if (!cuotaNueva || cuotaNueva.acuerdoId !== acuerdoId) {
      return NextResponse.json({ error: "La cuota no pertenece a este acuerdo" }, { status: 400 });
    }
  }

  let comprobanteUrl = movimientoActual.comprobanteUrl;
  if (file instanceof File && file.size > 0) {
    const validation = validateFileMovara({ size: file.size, type: file.type });
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }
    const path = buildStoragePath("cobranza", acuerdoId, file.name);
    const bytes = await file.arrayBuffer();
    try {
      await uploadDocument(BUCKET_MOVARA, path, bytes, file.type);
    } catch (err) {
      console.error("[cobranza/movimientos/editar]", err);
      return NextResponse.json({ error: "No pudimos subir el comprobante" }, { status: 500 });
    }
    comprobanteUrl = path;
  }

  await db.movimiento.update({
    where: { id: movimientoId },
    data: {
      fecha: fechaNueva,
      importe: data.importe,
      cuotaId: data.cuotaId,
      modalidad: data.modalidad,
      comprobanteUrl,
      notas: data.notas,
    },
  });

  // La cuota asociada pudo cambiar — recalcular tanto la anterior (si
  // tenía una y ya no) como la nueva (si corresponde).
  const cuotaAnteriorId = movimientoActual.cuotaId;
  if (cuotaAnteriorId && cuotaAnteriorId !== data.cuotaId) {
    await recalcularEstadoCuota(cuotaAnteriorId);
  }
  if (cuotaNueva) {
    await recalcularEstadoCuota(cuotaNueva.id, cuotaNueva);
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<Params> }) {
  const { id: acuerdoId, movimientoId } = await params;

  const session = await getAdminUser();
  if (!session) {
    return NextResponse.json({ error: "Sesión inválida" }, { status: 401 });
  }

  const movimiento = await findMovimiento(acuerdoId, movimientoId);
  if (!movimiento) {
    return NextResponse.json({ error: "Pago no encontrado" }, { status: 404 });
  }

  if (await periodoEstaCerrado(movimiento.fecha)) {
    return NextResponse.json(
      { error: "Ese período ya está cerrado — no se pueden borrar pagos con esa fecha" },
      { status: 400 }
    );
  }

  await db.movimiento.delete({ where: { id: movimientoId } });

  if (movimiento.cuotaId) {
    await recalcularEstadoCuota(movimiento.cuotaId);
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
