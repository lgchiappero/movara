import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdminUser } from "@/lib/admin/current-user";
import { periodoEstaCerrado } from "@/lib/cobranza/periodo-cerrado";
import { leerCostoLogistica } from "@/lib/cobranza/costo-logistica-form";
import { subirComprobante } from "@/lib/cobranza/comprobante";
import { prorratear } from "@/lib/cobranza/logistica";

/** Alta de un costo de logística internacional (por envío). Con
 * prorratear=true divide el importe entre las unidades del envío y guarda
 * un ProrrateoLogistica por unidad. */
export async function POST(req: NextRequest) {
  const session = await getAdminUser();
  if (!session) {
    return NextResponse.json({ error: "Sesión inválida" }, { status: 401 });
  }

  const form = await req.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ error: "Formulario inválido" }, { status: 400 });
  }
  const envioId = form.get("envioId");
  if (typeof envioId !== "string" || !envioId) {
    return NextResponse.json({ error: "Falta el envío" }, { status: 400 });
  }
  const leido = leerCostoLogistica(form);
  if (!leido.ok) {
    return NextResponse.json({ error: leido.error }, { status: leido.status });
  }
  const { data, comprobante } = leido.value;

  const envio = await db.envio.findUnique({
    where: { id: envioId },
    select: { id: true, unidades: { select: { id: true }, orderBy: { createdAt: "asc" } } },
  });
  if (!envio) {
    return NextResponse.json({ error: "Envío no encontrado" }, { status: 404 });
  }
  if (data.prorratear && envio.unidades.length === 0) {
    return NextResponse.json({ error: "El envío no tiene unidades para prorratear el costo" }, { status: 400 });
  }

  const fecha = new Date(data.fecha);
  if (data.estado === "pagado" && (await periodoEstaCerrado(fecha))) {
    return NextResponse.json(
      { error: "Ese período ya está cerrado — no se pueden cargar pagos con esa fecha" },
      { status: 400 }
    );
  }

  let comprobanteUrl: string | null = null;
  if (comprobante) {
    const subida = await subirComprobante(comprobante, "logistica", envioId);
    if (!subida.ok) return NextResponse.json({ error: subida.error }, { status: subida.status });
    comprobanteUrl = subida.value;
  }

  const costo = await db.costoLogistica.create({
    data: {
      envioId,
      concepto: data.concepto,
      descripcion: data.descripcion ?? null,
      moneda: data.moneda,
      importe: data.importe,
      fecha,
      estado: data.estado,
      comprobanteUrl,
      notas: data.notas ?? null,
      prorrateado: data.prorratear,
      registradoPor: session.email,
      ...(data.prorratear
        ? { prorrateos: { create: prorratear(data.importe, envio.unidades.map((u) => u.id)) } }
        : {}),
    },
    select: { id: true },
  });

  return NextResponse.json({ ok: true, id: costo.id }, { status: 201 });
}
