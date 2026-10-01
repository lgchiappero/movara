import { db } from "@/lib/db";
import { getAdminUser } from "@/lib/admin/current-user";
import PagosPanel from "@/components/admin/PagosPanel";
import { serializeAcuerdo } from "@/lib/cobranza/serialize";
import { conComprobantesFirmados } from "@/lib/cobranza/attach-signed-urls";
import { filasPorUnidad, metricasPlanes, filtroEstadoDesdeQuery } from "@/lib/cobranza/planes-unidad";
import type { UnidadOpcion } from "@/lib/cobranza/types";

export const dynamic = "force-dynamic";

/** Pagos a proveedores — dinero que sale. Misma lógica que Cobranza
 * (/admin/cobranza, dinero que entra del cliente), dirección opuesta. */
export default async function AdminPagosPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string; vence?: string; moneda?: string }>;
}) {
  const sp = await searchParams;
  const now = new Date();
  const hoy = new Date(now);
  hoy.setHours(0, 0, 0, 0);
  const inicioMes = new Date(now.getFullYear(), now.getMonth(), 1);
  const inicioMesSiguiente = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  // Mismo barrido de auto-vencimiento que /admin/cobranza.
  await db.cuota.updateMany({
    where: { estado: "pendiente", vencimiento: { lt: hoy } },
    data: { estado: "vencido" },
  });

  const [session, acuerdosRaw, unidadesRaw, pagadoUSDAgg, pagadoARSAgg] = await Promise.all([
    getAdminUser(),
    db.acuerdoPago.findMany({
      where: { tipo: "pago" },
      include: {
        unidad: {
          select: {
            numeroUnidad: true,
            modelo: true,
            estadoFabricacion: true,
            cliente: { select: { id: true, nombre: true } },
          },
        },
        cuotas: { orderBy: { vencimiento: "asc" } },
        movimientos: { orderBy: { fecha: "desc" } },
      },
      orderBy: { createdAt: "desc" },
    }),
    db.unidad.findMany({
      select: { id: true, numeroUnidad: true, modelo: true, precioCliente: true, cliente: { select: { nombre: true } } },
      orderBy: { createdAt: "desc" },
    }),
    db.movimiento.aggregate({
      _sum: { importe: true },
      where: { fecha: { gte: inicioMes, lt: inicioMesSiguiente }, acuerdo: { tipo: "pago", moneda: "USD" } },
    }),
    db.movimiento.aggregate({
      _sum: { importe: true },
      where: { fecha: { gte: inicioMes, lt: inicioMesSiguiente }, acuerdo: { tipo: "pago", moneda: "ARS" } },
    }),
  ]);

  const acuerdos = await conComprobantesFirmados(acuerdosRaw.map(serializeAcuerdo));
  const filas = filasPorUnidad(
    unidadesRaw.map((u) => ({
      id: u.id,
      numeroUnidad: u.numeroUnidad,
      clienteNombre: u.cliente.nombre,
      modelo: u.modelo,
      precioCliente: u.precioCliente,
    })),
    acuerdos,
    now
  );
  const metricas = metricasPlanes(filas, now);
  const unidades: UnidadOpcion[] = unidadesRaw.map((u) => ({
    id: u.id,
    numeroUnidad: u.numeroUnidad,
    clienteNombre: u.cliente.nombre,
  }));

  const monedaInicial = sp.moneda === "USD" || sp.moneda === "ARS" ? sp.moneda : undefined;

  return (
    <div className="max-w-7xl mx-auto px-6 py-12 space-y-6">
      <div>
        <p className="text-sage-500 text-xs font-bold uppercase tracking-widest mb-1">Panel MOVARA</p>
        <h1 className="text-2xl font-bold text-[#2F2F2F]">Pagos</h1>
      </div>
      <PagosPanel
        filas={filas}
        unidades={unidades}
        rol={session?.rol ?? "vendedor"}
        metricas={{
          pagadoMes: { USD: pagadoUSDAgg._sum.importe ?? 0, ARS: pagadoARSAgg._sum.importe ?? 0 },
          pendiente: metricas.pendiente,
          unidadesCompletasMes: metricas.unidadesSaldadasMes,
          unidadesConVencidas: metricas.unidadesConVencidas,
        }}
        estadoInicial={filtroEstadoDesdeQuery(sp.estado, sp.vence)}
        monedaInicial={monedaInicial}
      />
    </div>
  );
}
