import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdminUser } from "@/lib/admin/current-user";
import { validateFileMovara } from "@/lib/admin/file-validation";
import { buildStoragePath, uploadDocument, BUCKET_MOVARA } from "@/lib/admin/storage";
import { registrarMovimientoSchema } from "@/lib/validators/cobranza";
import { estadoCuota } from "@/lib/cobranza/calc";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: acuerdoId } = await params;

  const session = await getAdminUser();
  if (!session) {
    return NextResponse.json({ error: "Sesión inválida" }, { status: 401 });
  }

  const acuerdo = await db.acuerdoPago.findUnique({ where: { id: acuerdoId } });
  if (!acuerdo) {
    return NextResponse.json({ error: "Acuerdo no encontrado" }, { status: 404 });
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

  const fechaMovimiento = new Date(data.fecha);
  const cierreDelMes = await db.cierrePeriodo.findUnique({
    where: { mes_anio: { mes: fechaMovimiento.getMonth() + 1, anio: fechaMovimiento.getFullYear() } },
  });
  if (cierreDelMes) {
    return NextResponse.json(
      { error: "Ese período ya está cerrado — no se pueden cargar movimientos con esa fecha" },
      { status: 400 }
    );
  }

  let cuota: { id: string; acuerdoId: string; importe: number; estado: string; vencimiento: Date | null } | null =
    null;
  if (data.cuotaId) {
    cuota = await db.cuota.findUnique({ where: { id: data.cuotaId } });
    if (!cuota || cuota.acuerdoId !== acuerdoId) {
      return NextResponse.json({ error: "La cuota no pertenece a este acuerdo" }, { status: 400 });
    }
  }

  let comprobanteUrl: string | null = null;
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
      console.error("[cobranza/movimientos]", err);
      return NextResponse.json({ error: "No pudimos subir el comprobante" }, { status: 500 });
    }
    comprobanteUrl = path;
  }

  const movimiento = await db.movimiento.create({
    data: {
      acuerdoId,
      cuotaId: data.cuotaId,
      fecha: fechaMovimiento,
      importe: data.importe,
      modalidad: data.modalidad,
      comprobanteUrl,
      notas: data.notas,
      registradoPor: session.email,
    },
  });

  // Recalcular el estado de la cuota saldada por este movimiento — el
  // estado del acuerdo no se persiste, se deriva en cada lectura (ver
  // src/lib/cobranza/calc.ts) así que no hay nada más que actualizar acá.
  if (cuota) {
    const movimientosCuota = await db.movimiento.findMany({
      where: { cuotaId: cuota.id },
      select: { importe: true },
    });
    const totalPagadoCuota = movimientosCuota.reduce((acc, m) => acc + m.importe, 0);
    const nuevoEstado = estadoCuota(cuota.importe, totalPagadoCuota, cuota.vencimiento, new Date());
    if (nuevoEstado !== cuota.estado) {
      await db.cuota.update({ where: { id: cuota.id }, data: { estado: nuevoEstado } });
    }
  }

  return NextResponse.json({ ok: true, id: movimiento.id }, { status: 201 });
}
