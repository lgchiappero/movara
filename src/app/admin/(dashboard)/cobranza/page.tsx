import { db } from "@/lib/db";
import { getAdminUser } from "@/lib/admin/current-user";
import CobranzaPanel from "@/components/admin/CobranzaPanel";
import { serializeAcuerdo } from "@/lib/cobranza/serialize";
import { conComprobantesFirmados } from "@/lib/cobranza/attach-signed-urls";
import {
  calcularRangoPeriodo,
  mesAnioUnico,
  inicioSemana,
  finSemana,
  contarPeriodosSinCerrar,
  PERIODO_TIPO_OPTIONS,
  type PeriodoTipo,
} from "@/lib/cobranza/periodo";
import type { UnidadOpcion, ClienteOpcion, TipoCambioRow, CierreRow } from "@/lib/cobranza/types";

export const dynamic = "force-dynamic";

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export default async function AdminCobranzaPage({
  searchParams,
}: {
  searchParams: Promise<{
    periodo?: string;
    desde?: string;
    hasta?: string;
    tab?: string;
    sub?: string;
    moneda?: string;
    estado?: string;
    clienteId?: string;
  }>;
}) {
  const sp = await searchParams;
  const now = new Date();
  const hoy = startOfDay(now);

  const periodoTipo: PeriodoTipo = (PERIODO_TIPO_OPTIONS as readonly string[]).includes(sp.periodo ?? "")
    ? (sp.periodo as PeriodoTipo)
    : "mes_actual";
  const rango = calcularRangoPeriodo(periodoTipo, now, sp.desde, sp.hasta);
  const mesUnico = mesAnioUnico(rango);

  // Auto-vencimiento: al entrar a esta página, cualquier cuota "pendiente"
  // con vencimiento ya pasado se marca "vencida" — barrido global, no
  // limitado al período seleccionado.
  await db.cuota.updateMany({
    where: { estado: "pendiente", vencimiento: { lt: hoy } },
    data: { estado: "vencido" },
  });

  const include = {
    unidad: {
      select: {
        numeroUnidad: true,
        modelo: true,
        estadoFabricacion: true,
        cliente: { select: { id: true, nombre: true } },
      },
    },
    cuotas: { orderBy: { vencimiento: "asc" as const } },
    movimientos: { orderBy: { fecha: "desc" as const } },
  };

  const [
    session,
    acuerdosCobroRaw,
    acuerdosPagoRaw,
    unidadesRaw,
    clientesRaw,
    tiposCambioRaw,
    cierresRaw,
    cobradoUSDAgg,
    cobradoARSAgg,
    pagadoUSDAgg,
    pagadoARSAgg,
    cuotasVencidas,
    cuotasVencenSemana,
    primerMovimientoAgg,
    cierreActualRaw,
  ] = await Promise.all([
    getAdminUser(),
    db.acuerdoPago.findMany({ where: { tipo: "cobro" }, include, orderBy: { createdAt: "desc" } }),
    db.acuerdoPago.findMany({ where: { tipo: "pago" }, include, orderBy: { createdAt: "desc" } }),
    db.unidad.findMany({
      select: { id: true, numeroUnidad: true, cliente: { select: { nombre: true } } },
      orderBy: { createdAt: "desc" },
    }),
    db.cliente.findMany({ select: { id: true, nombre: true }, orderBy: { nombre: "asc" } }),
    db.tipoCambio.findMany({ orderBy: { fecha: "desc" }, take: 60 }),
    db.cierrePeriodo.findMany({ orderBy: [{ anio: "desc" }, { mes: "desc" }] }),
    db.movimiento.aggregate({
      _sum: { importe: true },
      where: { fecha: { gte: rango.desde, lt: rango.hasta }, acuerdo: { tipo: "cobro", moneda: "USD" } },
    }),
    db.movimiento.aggregate({
      _sum: { importe: true },
      where: { fecha: { gte: rango.desde, lt: rango.hasta }, acuerdo: { tipo: "cobro", moneda: "ARS" } },
    }),
    db.movimiento.aggregate({
      _sum: { importe: true },
      where: { fecha: { gte: rango.desde, lt: rango.hasta }, acuerdo: { tipo: "pago", moneda: "USD" } },
    }),
    db.movimiento.aggregate({
      _sum: { importe: true },
      where: { fecha: { gte: rango.desde, lt: rango.hasta }, acuerdo: { tipo: "pago", moneda: "ARS" } },
    }),
    db.cuota.count({ where: { estado: "vencido" } }),
    db.cuota.count({
      where: { estado: "pendiente", vencimiento: { gte: inicioSemana(now), lt: finSemana(now) } },
    }),
    db.movimiento.aggregate({ _min: { fecha: true } }),
    mesUnico
      ? db.cierrePeriodo.findUnique({ where: { mes_anio: { mes: mesUnico.mes, anio: mesUnico.anio } } })
      : Promise.resolve(null),
  ]);

  const [acuerdosCobro, acuerdosPago] = await Promise.all([
    conComprobantesFirmados(acuerdosCobroRaw.map(serializeAcuerdo)),
    conComprobantesFirmados(acuerdosPagoRaw.map(serializeAcuerdo)),
  ]);

  const unidades: UnidadOpcion[] = unidadesRaw.map((u) => ({
    id: u.id,
    numeroUnidad: u.numeroUnidad,
    clienteNombre: u.cliente.nombre,
  }));
  const clientes: ClienteOpcion[] = clientesRaw;
  const tiposCambio: TipoCambioRow[] = tiposCambioRaw.map((t) => ({
    id: t.id,
    fecha: t.fecha.toISOString(),
    usdArs: t.usdArs,
    fuente: t.fuente,
    cargadoPor: t.cargadoPor,
  }));
  const cierres: CierreRow[] = cierresRaw.map((c) => ({
    id: c.id,
    mes: c.mes,
    anio: c.anio,
    cerradoPor: c.cerradoPor,
    notas: c.notas,
    totalCobradoUSD: c.totalCobradoUSD,
    totalCobradoARS: c.totalCobradoARS,
    totalPagadoUSD: c.totalPagadoUSD,
    totalPagadoARS: c.totalPagadoARS,
    margenUSD: c.margenUSD,
    createdAt: c.createdAt.toISOString(),
  }));

  const cobradoUSD = cobradoUSDAgg._sum.importe ?? 0;
  const cobradoARS = cobradoARSAgg._sum.importe ?? 0;
  const pagadoUSD = pagadoUSDAgg._sum.importe ?? 0;
  const pagadoARS = pagadoARSAgg._sum.importe ?? 0;

  const periodosSinCerrar = contarPeriodosSinCerrar(
    primerMovimientoAgg._min.fecha,
    now,
    cierres.map((c) => ({ mes: c.mes, anio: c.anio }))
  );

  const rol = session?.rol ?? "vendedor";

  const tabInicial = sp.tab === "rentabilidad" || sp.tab === "cuenta-cliente" || sp.tab === "tipo-cambio" || sp.tab === "cierres" || sp.tab === "gestion" ? sp.tab : undefined;
  const subInicial = sp.sub === "pagos" ? "pagos" : sp.sub === "cobros" ? "cobros" : undefined;
  const estadoInicial = sp.estado ?? undefined;
  const monedaInicial = sp.moneda === "USD" || sp.moneda === "ARS" ? sp.moneda : undefined;
  const clienteIdInicial = sp.clienteId ?? undefined;

  return (
    <div className="max-w-7xl mx-auto px-6 py-12 space-y-6">
      <div>
        <p className="text-sage-500 text-xs font-bold uppercase tracking-widest mb-1">Panel MOVARA</p>
        <h1 className="text-2xl font-bold text-[#2F2F2F]">Cobranza</h1>
      </div>

      <CobranzaPanel
        acuerdosCobro={acuerdosCobro}
        acuerdosPago={acuerdosPago}
        unidades={unidades}
        clientes={clientes}
        tiposCambio={tiposCambio}
        cierres={cierres}
        rol={rol}
        periodo={{ tipo: periodoTipo, desde: rango.desde.toISOString(), hasta: rango.hasta.toISOString() }}
        mesUnico={mesUnico}
        cierreActual={
          cierreActualRaw
            ? {
                id: cierreActualRaw.id,
                mes: cierreActualRaw.mes,
                anio: cierreActualRaw.anio,
                cerradoPor: cierreActualRaw.cerradoPor,
                notas: cierreActualRaw.notas,
                totalCobradoUSD: cierreActualRaw.totalCobradoUSD,
                totalCobradoARS: cierreActualRaw.totalCobradoARS,
                totalPagadoUSD: cierreActualRaw.totalPagadoUSD,
                totalPagadoARS: cierreActualRaw.totalPagadoARS,
                margenUSD: cierreActualRaw.margenUSD,
                createdAt: cierreActualRaw.createdAt.toISOString(),
              }
            : null
        }
        metricas={{
          usd: { cobrado: cobradoUSD, pagado: pagadoUSD, margen: cobradoUSD - pagadoUSD },
          ars: { cobrado: cobradoARS, pagado: pagadoARS, margen: cobradoARS - pagadoARS },
          cuotasVencidas,
          cuotasVencenSemana,
          periodosSinCerrar,
        }}
        tabInicial={tabInicial}
        subInicial={subInicial}
        estadoInicial={estadoInicial}
        monedaInicial={monedaInicial}
        clienteIdInicial={clienteIdInicial}
      />
    </div>
  );
}
