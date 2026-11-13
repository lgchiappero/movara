import { db } from "@/lib/db";
import { getAdminUser } from "@/lib/admin/current-user";
import { getSignedUrl, BUCKET_MOVARA } from "@/lib/admin/storage";
import PagosPanel, { type TabPagos } from "@/components/admin/PagosPanel";
import { serializeAcuerdo } from "@/lib/cobranza/serialize";
import { conComprobantesFirmados } from "@/lib/cobranza/attach-signed-urls";
import { COSTO_INCLUDE, serializeCosto } from "@/lib/cobranza/logistica";
import { hoySoloFechaAR } from "@/lib/fecha-ar";
import { metricasPagos, pagosVencidos } from "@/lib/indicadores/pagos";
import type { UnidadOpcion } from "@/lib/cobranza/types";

export const dynamic = "force-dynamic";

const ESTADOS_FILTRO = ["pendiente", "parcial", "pagado", "vencido", "con_saldo"] as const;

/** Pagos a proveedores — dinero que sale. Por unidad (fábrica + logística
 * nacional, planes de cuotas) y logística internacional (por envío). */
export default async function AdminPagosPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; estado?: string }>;
}) {
  const sp = await searchParams;
  const now = new Date();

  // Mismo barrido de auto-vencimiento que /admin/cobranza (vencimiento:
  // solo fecha, contra hoy en Argentina).
  await db.cuota.updateMany({
    where: { estado: "pendiente", vencimiento: { lt: hoySoloFechaAR(now) } },
    data: { estado: "vencido" },
  });

  const [session, planesRaw, costosRaw, unidadesRaw, enviosRaw] = await Promise.all([
    getAdminUser(),
    db.acuerdoPago.findMany({
      where: { tipo: "pago" },
      include: {
        unidad: {
          select: { numeroUnidad: true, modelo: true, estadoFabricacion: true, cliente: { select: { id: true, nombre: true } } },
        },
        cuotas: { orderBy: { vencimiento: "asc" } },
        movimientos: { orderBy: { fecha: "desc" } },
      },
      orderBy: { createdAt: "desc" },
    }),
    db.costoLogistica.findMany({ include: COSTO_INCLUDE, orderBy: { fecha: "desc" } }),
    db.unidad.findMany({
      select: { id: true, numeroUnidad: true, cliente: { select: { nombre: true } } },
      orderBy: { createdAt: "desc" },
    }),
    db.envio.findMany({
      select: { id: true, numeroPI: true, numeroContenedor: true, _count: { select: { unidades: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const planes = await conComprobantesFirmados(planesRaw.map(serializeAcuerdo));
  const costos = await Promise.all(
    costosRaw.map(async (c) => {
      const row = serializeCosto(c);
      return c.comprobanteUrl ? { ...row, comprobanteSignedUrl: await getSignedUrl(BUCKET_MOVARA, c.comprobanteUrl) } : row;
    })
  );

  // Tarjetas: las mismas funciones que el dashboard (indicadores/pagos.ts).
  // "Pagos vencidos" = filas de pagosVencidos(): planes con cuotas vencidas
  // con saldo + costos de logística pendientes con fecha pasada; el link de
  // la tarjeta muestra exactamente esas filas.
  const { pagadoMes, porPagar } = metricasPagos(planes, costos, now);
  const vencidos = pagosVencidos(planes, costos, now);

  const unidades: UnidadOpcion[] = unidadesRaw.map((u) => ({ id: u.id, numeroUnidad: u.numeroUnidad, clienteNombre: u.cliente.nombre }));
  const envios = enviosRaw.map((e) => ({
    id: e.id,
    numeroPI: e.numeroPI,
    numeroContenedor: e.numeroContenedor,
    cantidadUnidades: e._count.unidades,
  }));

  const tabInicial: TabPagos = sp.tab === "logistica" ? "logistica" : "unidad";
  const estadoAlias = sp.estado === "vencidas" ? "vencido" : sp.estado === "saldado" ? "pagado" : sp.estado;
  const estadoInicial = (ESTADOS_FILTRO as readonly string[]).includes(estadoAlias ?? "")
    ? (estadoAlias as (typeof ESTADOS_FILTRO)[number])
    : undefined;

  return (
    <div className="max-w-7xl mx-auto px-6 py-12 space-y-6">
      <div>
        <p className="text-sage-500 text-xs font-bold uppercase tracking-widest mb-1">Panel MOVARA</p>
        <h1 className="text-2xl font-bold text-[#2F2F2F]">Pagos</h1>
      </div>
      <PagosPanel
        planes={planes}
        costos={costos}
        unidades={unidades}
        envios={envios}
        rol={session?.rol ?? "vendedor"}
        metricas={{ pagadoMes, pendiente: porPagar }}
        vencidos={vencidos}
        tabInicial={tabInicial}
        estadoInicial={estadoInicial}
      />
    </div>
  );
}
