import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdminUser } from "@/lib/admin/current-user";

/** Lista completa de los pagos (movimientos) del mes de un cierre —
 * CierrePeriodo solo guarda los 4 totales agregados, no las filas
 * individuales, así que se recalcula on-demand acá (se pide una sola vez,
 * al abrir "Ver resumen" de ese cierre puntual). */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAdminUser();
  if (!session) {
    return NextResponse.json({ error: "Sesión inválida" }, { status: 401 });
  }

  const { id } = await params;
  const cierre = await db.cierrePeriodo.findUnique({ where: { id } });
  if (!cierre) {
    return NextResponse.json({ error: "Cierre no encontrado" }, { status: 404 });
  }

  const desde = new Date(cierre.anio, cierre.mes - 1, 1);
  const hasta = new Date(cierre.anio, cierre.mes, 1);

  const movimientos = await db.movimiento.findMany({
    where: { fecha: { gte: desde, lt: hasta } },
    include: {
      acuerdo: {
        select: {
          tipo: true,
          concepto: true,
          moneda: true,
          contraparte: true,
          unidad: { select: { numeroUnidad: true } },
        },
      },
    },
    orderBy: { fecha: "asc" },
  });

  const pagos = movimientos.map((m) => ({
    id: m.id,
    fecha: m.fecha.toISOString(),
    unidadNumero: m.acuerdo.unidad.numeroUnidad,
    contraparte: m.acuerdo.contraparte,
    tipo: m.acuerdo.tipo,
    concepto: m.acuerdo.concepto,
    moneda: m.acuerdo.moneda,
    importe: m.importe,
    modalidad: m.modalidad,
  }));

  return NextResponse.json({ pagos }, { status: 200 });
}
