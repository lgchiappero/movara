import { db } from "@/lib/db";
import { getAdminUser } from "@/lib/admin/current-user";
import { getSignedUrl, BUCKET_MOVARA } from "@/lib/admin/storage";
import PagosPanel, { type TabPagos } from "@/components/admin/PagosPanel";
import { serializeAcuerdo } from "@/lib/cobranza/serialize";
import { conComprobantesFirmados } from "@/lib/cobranza/attach-signed-urls";
import { sumaImportes } from "@/lib/cobranza/calc";
import { estadoPagoUnidad } from "@/lib/cobranza/pagos-unidad";
import { COSTO_INCLUDE, serializeCosto, totalesLogistica } from "@/lib/cobranza/logistica";
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
  const hoy = new Date(now);
  hoy.setHours(0, 0, 0, 0);
  const inicioMes = new Date(now.getFullYear(), now.getMonth(), 1);
  const inicioMesSiguiente = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  // Mismo barrido de auto-vencimiento que /admin/cobranza.
  await db.cuota.updateMany({
    where: { estado: "pendiente", vencimiento: { lt: hoy } },
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

  // Métricas: pagos por unidad (movimientos) + costos de logística.
  const enMes = (iso: string) => {
    const t = new Date(iso).getTime();
    return t >= inicioMes.getTime() && t < inicioMesSiguiente.getTime();
  };
  const pagadoMes = { USD: 0, ARS: 0 };
  const pendiente = { USD: 0, ARS: 0 };
  let vencidos = 0;
  for (const p of planes) {
    if (p.moneda !== "USD" && p.moneda !== "ARS") continue;
    pagadoMes[p.moneda] += sumaImportes(p.movimientos.filter((m) => enMes(m.fecha)));
    pendiente[p.moneda] += Math.max(0, p.totalAcordado - sumaImportes(p.movimientos));
    if (estadoPagoUnidad(p, hoy) === "vencido") vencidos++;
  }
  const logistica = totalesLogistica(costos);
  const logisticaPagadaMes = totalesLogistica(costos.filter((c) => enMes(c.fecha))).pagado;
  pagadoMes.USD += logisticaPagadaMes.USD;
  pagadoMes.ARS += logisticaPagadaMes.ARS;
  pendiente.USD += logistica.pendiente.USD;
  pendiente.ARS += logistica.pendiente.ARS;
  vencidos += costos.filter((c) => c.estado === "pendiente" && new Date(c.fecha).getTime() < hoy.getTime()).length;

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
        metricas={{ pagadoMes, pendiente, vencidos }}
        tabInicial={tabInicial}
        estadoInicial={estadoInicial}
      />
    </div>
  );
}
