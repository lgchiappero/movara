import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdminUser } from "@/lib/admin/current-user";
import { estadoCuota } from "@/lib/cobranza/calc";
import { CONCEPTO_LABELS } from "@/lib/cobranza/constantes";
import { periodoEstaCerrado } from "@/lib/cobranza/periodo-cerrado";
import { leerPagoProveedor, subirComprobante } from "@/lib/cobranza/pago-proveedor-form";

/** Alta de un pago directo a proveedor (ver src/lib/cobranza/pagos-proveedor.ts
 * para cómo se guarda sobre AcuerdoPago/Cuota/Movimiento). */
export async function POST(req: NextRequest) {
  const session = await getAdminUser();
  if (!session) {
    return NextResponse.json({ error: "Sesión inválida" }, { status: 401 });
  }

  const form = await req.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ error: "Formulario inválido" }, { status: 400 });
  }
  const unidadId = form.get("unidadId");
  if (typeof unidadId !== "string" || !unidadId) {
    return NextResponse.json({ error: "Falta la unidad" }, { status: 400 });
  }
  const leido = leerPagoProveedor(form);
  if (!leido.ok) {
    return NextResponse.json({ error: leido.error }, { status: leido.status });
  }
  const { data, comprobante } = leido.value;

  const unidad = await db.unidad.findUnique({ where: { id: unidadId }, select: { id: true } });
  if (!unidad) {
    return NextResponse.json({ error: "Unidad no encontrada" }, { status: 404 });
  }

  const fecha = new Date(data.fecha);
  const pagado = data.estado === "pagado";
  if (pagado && (await periodoEstaCerrado(fecha))) {
    return NextResponse.json(
      { error: "Ese período ya está cerrado — no se pueden cargar pagos con esa fecha" },
      { status: 400 }
    );
  }

  let comprobanteUrl: string | null = null;
  if (comprobante) {
    const subida = await subirComprobante(comprobante, unidadId);
    if (!subida.ok) return NextResponse.json({ error: subida.error }, { status: subida.status });
    comprobanteUrl = subida.value;
  }

  const acuerdo = await db.$transaction(async (tx) => {
    const creado = await tx.acuerdoPago.create({
      data: {
        unidadId,
        tipo: "pago",
        concepto: data.concepto,
        descripcion: data.descripcion ?? null,
        contraparte: data.proveedor,
        moneda: data.moneda,
        totalAcordado: data.importe,
        notas: data.notas ?? null,
        registradoPor: session.email,
        cuotas: {
          create: {
            descripcion: data.descripcion || CONCEPTO_LABELS[data.concepto],
            importe: data.importe,
            vencimiento: fecha,
            estado: pagado ? "pagado" : estadoCuota(data.importe, 0, fecha, new Date()),
          },
        },
      },
      select: { id: true, cuotas: { select: { id: true } } },
    });
    if (pagado) {
      await tx.movimiento.create({
        data: {
          acuerdoId: creado.id,
          cuotaId: creado.cuotas[0].id,
          fecha,
          importe: data.importe,
          modalidad: data.modalidad,
          comprobanteUrl,
          notas: data.notas ?? null,
          registradoPor: session.email,
        },
      });
    }
    return creado;
  });

  return NextResponse.json({ ok: true, id: acuerdo.id }, { status: 201 });
}
