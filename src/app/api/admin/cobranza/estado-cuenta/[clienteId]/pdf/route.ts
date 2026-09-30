import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { db } from "@/lib/db";
import { getAdminUser } from "@/lib/admin/current-user";
import { sumaImportes, estadoAcuerdo } from "@/lib/cobranza/calc";
import { EstadoCuentaDocument, type AcuerdoParaPdf, type MovimientoParaPdf } from "@/lib/pdf/EstadoCuentaDocument";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ clienteId: string }> }) {
  const session = await getAdminUser();
  if (!session) {
    return NextResponse.json({ error: "Sesión inválida" }, { status: 401 });
  }

  const { clienteId } = await params;

  const cliente = await db.cliente.findUnique({ where: { id: clienteId }, select: { id: true, nombre: true } });
  if (!cliente) {
    return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });
  }

  const acuerdosRaw = await db.acuerdoPago.findMany({
    where: { tipo: "cobro", unidad: { clienteId } },
    include: {
      unidad: { select: { numeroUnidad: true } },
      cuotas: true,
      movimientos: { orderBy: { fecha: "desc" } },
    },
    orderBy: { createdAt: "desc" },
  });

  const acuerdos: AcuerdoParaPdf[] = acuerdosRaw.map((a) => {
    const movido = sumaImportes(a.movimientos);
    return {
      id: a.id,
      unidadNumero: a.unidad.numeroUnidad,
      concepto: a.concepto,
      moneda: a.moneda,
      totalAcordado: a.totalAcordado,
      pendiente: a.totalAcordado - movido,
      estado: estadoAcuerdo(a.totalAcordado, movido, a.cuotas),
    };
  });

  const movimientos: MovimientoParaPdf[] = acuerdosRaw
    .flatMap((a) => a.movimientos.map((m) => ({ ...m, moneda: a.moneda, unidadNumero: a.unidad.numeroUnidad })))
    .sort((a, b) => b.fecha.getTime() - a.fecha.getTime())
    .map((m) => ({
      id: m.id,
      fecha: m.fecha.toISOString(),
      unidadNumero: m.unidadNumero,
      importe: m.importe,
      moneda: m.moneda,
      modalidad: m.modalidad,
    }));

  const saldosMap = new Map<string, number>();
  for (const a of acuerdos) {
    saldosMap.set(a.moneda, (saldosMap.get(a.moneda) ?? 0) + a.pendiente);
  }

  const fechaEmision = new Date().toLocaleDateString("es-AR", { year: "numeric", month: "long", day: "numeric" });

  const pdfBuffer = await renderToBuffer(
    EstadoCuentaDocument({
      clienteNombre: cliente.nombre,
      fechaEmision,
      acuerdos,
      movimientos,
      saldosPorMoneda: Array.from(saldosMap.entries()),
    })
  );

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="estado-cuenta-${cliente.nombre.replace(/\s+/g, "-").toLowerCase()}.pdf"`,
    },
  });
}
