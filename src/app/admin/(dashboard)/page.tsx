import Link from "next/link";
import { db } from "@/lib/db";
import { estadoPedidoOptions, estadoPedidoLabels } from "@/lib/pedido/estado-pedido";
import { getAdminUser } from "@/lib/admin/current-user";
import { isAllowedForRole } from "@/lib/admin/roles";
import { ADMIN_NAV_ITEMS } from "@/lib/admin/nav-items";
import {
  estadoFabricacionOptions,
  estadoFabricacionLabels,
  estadoFabricacionColors,
  SECCIONES_UNIDAD,
  SECCIONES_CRITICAS_UNIDAD,
  type EstadoFabricacion,
} from "@/lib/envios/constantes";
import { ETAPA_LABELS, ETAPA_COLORS, type Etapa } from "@/lib/leads/constantes";
import { estadoGeneralEnvio } from "@/lib/envios/estado-general";
import { diasHasta, seccionesFaltantes } from "@/lib/dashboard/calc";
import { hoyFechaKey, fechaKeyToDate } from "@/lib/agenda/fecha";
import UnidadesEnMovimientoGrid, {
  type UnidadMovimiento,
} from "@/components/admin/UnidadesEnMovimientoGrid";
import { inicioSemana as inicioSemanaCobranza, finSemana as finSemanaCobranza } from "@/lib/cobranza/periodo";
import { proximoPasoCorto } from "@/lib/envios/timeline";
import { primerCobroPorUnidad } from "@/lib/cobranza/primer-cobro";

const MESES_LABEL = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export const dynamic = "force-dynamic";

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

const SECCION_TITULOS: Record<string, string> = Object.fromEntries(
  SECCIONES_UNIDAD.map((s) => [s.key, s.titulo])
);

const CITA_ESTADO_LABELS: Record<string, string> = {
  confirmada: "Confirmada",
  cancelada: "Cancelada",
  completada: "Completada",
};

const CITA_ESTADO_COLORS: Record<string, string> = {
  confirmada: "bg-[#D4B06A]/20 text-[#8a6a2e]",
  cancelada: "bg-stone-200 text-stone-500",
  completada: "bg-emerald-100 text-emerald-700",
};

const BOTON_VER_ALERTA =
  "flex-shrink-0 px-3 py-1.5 bg-white border border-red-200 hover:bg-red-50 text-red-700 font-bold text-xs rounded-lg transition-colors whitespace-nowrap";

function diasRestantesLabel(dias: number | null): string {
  if (dias === null) return "—";
  if (dias < 0) return "Vencido";
  if (dias === 0) return "Hoy";
  return `${dias} día${dias === 1 ? "" : "s"}`;
}

function formatUSD(value: number | null): string {
  return `USD ${(value ?? 0).toLocaleString("es-AR", { maximumFractionDigits: 0 })}`;
}

type UnidadParaGrilla = {
  id: string;
  clienteId: string;
  numeroUnidad: string | null;
  modelo: string | null;
  precioCliente: number | null;
  provinciaDestino: string | null;
  estadoFabricacion: string;
  createdAt: Date;
  fechaEntrega: Date | null;
  cliente: { nombre: string };
  envio: { numeroPI: string | null; fechaEmbarque: Date | null; fechaArriboEstimado: Date | null } | null;
};

function toUnidadMovimiento(u: UnidadParaGrilla, primerCobroMap: Map<string, Date>): UnidadMovimiento {
  return {
    id: u.id,
    numeroUnidad: u.numeroUnidad,
    clienteNombre: u.cliente.nombre,
    modelo: u.modelo,
    envioNumeroPI: u.envio?.numeroPI ?? null,
    estadoFabricacion: u.estadoFabricacion,
    tienePrecio: u.precioCliente != null,
    fechaEmbarque: u.envio?.fechaEmbarque?.toISOString() ?? null,
    fechaArriboEstimado: u.envio?.fechaArriboEstimado?.toISOString() ?? null,
    fechaEntrega: u.fechaEntrega?.toISOString() ?? null,
    provinciaDestino: u.provinciaDestino,
    proximoPaso: proximoPasoCorto({
      clienteId: u.clienteId,
      modelo: u.modelo,
      precioCliente: u.precioCliente,
      estadoFabricacion: u.estadoFabricacion,
      createdAt: u.createdAt,
      fechaEntrega: u.fechaEntrega,
      fechaEmbarque: u.envio?.fechaEmbarque ?? null,
      primerCobroFecha: primerCobroMap.get(u.id) ?? null,
    }),
  };
}

export default async function AdminDashboardPage() {
  const now = new Date();
  const hace48hs = new Date(now.getTime() - 48 * 60 * 60 * 1000);
  const hace24hs = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const hace15dias = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000);
  const hace7dias = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const fechaHoy = fechaKeyToDate(hoyFechaKey());
  const inicioMes = startOfMonth(now);
  const inicioMesSiguiente = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const mesAnteriorFecha = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const mesAnteriorNum = mesAnteriorFecha.getMonth() + 1;
  const anioAnterior = mesAnteriorFecha.getFullYear();

  const [
    leadsHoy,
    leadsEnNegociacion,
    leadsGanadosMes,
    estadoCounts,
    session,
    unidadesActivas,
    unidadesActualizadas24h,
    unidadesEntregadas,
    unidadesPorEstadoRaw,
    envios,
    citasHoy,
    leadsSinRespuesta,
    unidadesEntregadasMes,
    cobradoEsteMesAgg,
    porCobrarTotalAgg,
    porCobrarMovidoAgg,
    cuotasVencenSemanaCobro,
    pagadoEsteMesAgg,
    porPagarTotalAgg,
    porPagarMovidoAgg,
    unidadesEnAduanaLargas,
    cobrosVencidos,
    leadsPipelineResumen,
    cuotasVencidas,
    cuotasVencenSemana,
    mesAnteriorCierre,
    mesAnteriorTuvoMovimientos,
  ] = await Promise.all([
    db.lead.count({ where: { createdAt: { gte: startOfDay(now) } } }),
    db.lead.count({ where: { etapa: { in: ["nuevo", "en_contacto", "propuesta_enviada"] } } }),
    // "Ganados este mes" usa la misma cohorte por createdAt que /admin/pipeline
    // (Lead no tiene un timestamp de "pasó a ganado").
    db.lead.count({ where: { etapa: "ganado", createdAt: { gte: inicioMes } } }),
    db.configuracionPedido.groupBy({ by: ["estadoPedido"], _count: { _all: true } }),
    getAdminUser(),
    db.unidad.findMany({
      where: { estadoFabricacion: { not: "entregado" } },
      include: {
        documentos: { select: { seccion: true } },
        cliente: { select: { nombre: true } },
        envio: { select: { numeroPI: true, fechaEmbarque: true, fechaArriboEstimado: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    db.unidad.findMany({
      where: { updatedAt: { gte: hace24hs } },
      select: { id: true, numeroUnidad: true, estadoFabricacion: true, cliente: { select: { nombre: true } } },
      orderBy: { updatedAt: "desc" },
      take: 10,
    }),
    db.unidad.findMany({
      where: { estadoFabricacion: "entregado" },
      select: {
        id: true,
        clienteId: true,
        numeroUnidad: true,
        modelo: true,
        precioCliente: true,
        provinciaDestino: true,
        estadoFabricacion: true,
        createdAt: true,
        fechaEntrega: true,
        cliente: { select: { nombre: true } },
        envio: { select: { numeroPI: true, fechaEmbarque: true, fechaArriboEstimado: true } },
      },
      orderBy: { fechaEntrega: "desc" },
    }),
    db.unidad.groupBy({ by: ["estadoFabricacion"], _count: { _all: true } }),
    db.envio.findMany({
      select: {
        id: true,
        numeroPI: true,
        numeroContenedor: true,
        fechaArriboEstimado: true,
        unidades: { select: { estadoFabricacion: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    db.cita.findMany({ where: { fecha: fechaHoy }, orderBy: { horario: "asc" } }),
    db.lead.count({ where: { contactado: false, createdAt: { lte: hace48hs } } }),
    db.unidad.count({ where: { estadoFabricacion: "entregado", fechaEntrega: { gte: inicioMes } } }),
    // Bloque Financiero del dashboard — a diferencia de las métricas de
    // Unidad.precioCliente que usaba antes (un proxy), estas 5 salen del
    // libro de cobranza real (AcuerdoPago/Movimiento/Cuota), igual que
    // /admin/cobranza, y enlazan ahí con los mismos filtros aplicados.
    // Todo en USD — el resto del dashboard también reporta solo en USD.
    db.movimiento.aggregate({
      _sum: { importe: true },
      where: { fecha: { gte: inicioMes, lt: inicioMesSiguiente }, acuerdo: { tipo: "cobro", moneda: "USD" } },
    }),
    db.acuerdoPago.aggregate({ _sum: { totalAcordado: true }, where: { tipo: "cobro", moneda: "USD" } }),
    db.movimiento.aggregate({
      _sum: { importe: true },
      where: { acuerdo: { tipo: "cobro", moneda: "USD" } },
    }),
    db.cuota.count({
      where: {
        estado: "pendiente",
        vencimiento: { gte: inicioSemanaCobranza(now), lt: finSemanaCobranza(now) },
        acuerdo: { tipo: "cobro" },
      },
    }),
    db.movimiento.aggregate({
      _sum: { importe: true },
      where: { fecha: { gte: inicioMes, lt: inicioMesSiguiente }, acuerdo: { tipo: "pago", moneda: "USD" } },
    }),
    db.acuerdoPago.aggregate({ _sum: { totalAcordado: true }, where: { tipo: "pago", moneda: "USD" } }),
    db.movimiento.aggregate({
      _sum: { importe: true },
      where: { acuerdo: { tipo: "pago", moneda: "USD" } },
    }),
    // Proxy: "hace más de 15 días" se mide contra updatedAt (no hay un
    // timestamp de "entró a aduana") — mismo criterio que ya usa esta
    // página para "unidades actualizadas (24hs)".
    db.unidad.count({ where: { estadoFabricacion: "en_aduana", updatedAt: { lte: hace15dias } } }),
    // Unidad no tiene campos de anticipo/cobro — este dato vive en
    // ConfiguracionPedido (anticipo + fechaConfirmacion), así que el alert
    // de "cobros vencidos" consulta ese modelo en vez de Unidad.
    db.configuracionPedido.count({
      where: { estadoPedido: "confirmado", anticipo: null, fechaConfirmacion: { lte: hace7dias } },
    }),
    db.lead.findMany({
      where: { etapa: { notIn: ["ganado", "perdido"] } },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, nombre: true, apellido: true, etapa: true, createdAt: true },
    }),
    // Vencidas "en vivo" por fecha (no por el campo estado) — el barrido
    // que marca Cuota.estado = "vencido" solo corre al cargar
    // /admin/cobranza, así que esta alerta no puede depender de que
    // alguien haya visitado esa página antes.
    db.cuota.count({
      where: { vencimiento: { lt: startOfDay(now) }, estado: { not: "pagado" } },
    }),
    db.cuota.count({
      where: {
        estado: "pendiente",
        vencimiento: { gte: inicioSemanaCobranza(now), lt: finSemanaCobranza(now) },
      },
    }),
    db.cierrePeriodo.findUnique({ where: { mes_anio: { mes: mesAnteriorNum, anio: anioAnterior } } }),
    // Solo tiene sentido avisar "sin cerrar" si el mes anterior tuvo algo
    // de actividad — un negocio recién arrancado no debería ver esta
    // alerta desde el primer día.
    db.movimiento.count({ where: { fecha: { gte: mesAnteriorFecha, lt: inicioMes } } }),
  ]);

  const rol = session?.rol ?? "vendedor";
  const cobradoEsteMes = cobradoEsteMesAgg._sum.importe ?? 0;
  const porCobrar = (porCobrarTotalAgg._sum.totalAcordado ?? 0) - (porCobrarMovidoAgg._sum.importe ?? 0);
  const pagadoEsteMes = pagadoEsteMesAgg._sum.importe ?? 0;
  const porPagar = (porPagarTotalAgg._sum.totalAcordado ?? 0) - (porPagarMovidoAgg._sum.importe ?? 0);
  const countByEstado = Object.fromEntries(
    estadoCounts.map((e) => [e.estadoPedido, e._count._all])
  ) as Record<string, number>;
  const countByEstadoUnidad = Object.fromEntries(
    unidadesPorEstadoRaw.map((e) => [e.estadoFabricacion, e._count._all])
  ) as Record<string, number>;

  const unidadesConFaltantes = unidadesActivas
    .map((u) => ({
      id: u.id,
      numeroUnidad: u.numeroUnidad,
      clienteNombre: u.cliente.nombre,
      faltantes: seccionesFaltantes(
        u.documentos.map((d) => d.seccion),
        SECCIONES_CRITICAS_UNIDAD
      ),
    }))
    .filter((u) => u.faltantes.length > 0);

  const primerCobroMap = await primerCobroPorUnidad([
    ...unidadesActivas.map((u) => u.id),
    ...unidadesEntregadas.map((u) => u.id),
  ]);
  const unidadesEnMovimiento: UnidadMovimiento[] = unidadesActivas.map((u) =>
    toUnidadMovimiento(u, primerCobroMap)
  );
  const unidadesEntregadasGrilla: UnidadMovimiento[] = unidadesEntregadas.map((u) =>
    toUnidadMovimiento(u, primerCobroMap)
  );

  const enviosConDerivados = envios.map((e) => ({
    ...e,
    estado: estadoGeneralEnvio(e.unidades),
    dias: diasHasta(e.fechaArriboEstimado, now),
    cantidadUnidades: e.unidades.length,
  }));
  const enviosActivos = enviosConDerivados.filter((e) => e.estado !== "entregado");

  // Alertas urgentes: exactamente las 4 condiciones pedidas (leads sin
  // contactar +48hs, documentación faltante, cobros vencidos, unidades en
  // aduana +15 días). Los avisos de "envíos con arribo próximo" y "citas
  // pendientes hoy" que antes vivían acá se sacaron de este bloque: el
  // segundo ya se cubre en detalle en "Agenda del día", y el primero no
  // forma parte de la lista pedida.
  const hayAlertas =
    leadsSinRespuesta > 0 ||
    unidadesConFaltantes.length > 0 ||
    cobrosVencidos > 0 ||
    unidadesEnAduanaLargas > 0 ||
    cuotasVencidas > 0 ||
    cuotasVencenSemana > 0 ||
    (mesAnteriorCierre === null && mesAnteriorTuvoMovimientos > 0);

  const accesosRapidos = ADMIN_NAV_ITEMS.filter(
    (item) => item.href !== "/admin" && isAllowedForRole(rol, item.href)
  );

  const MOSTRAR_MAX_FALTANTES = 15;

  return (
    <div className="space-y-8">
      <div>
        <p className="text-[#D4B06A] text-xs font-bold uppercase tracking-widest mb-1">Panel MOVARA</p>
        <h1 className="text-2xl font-bold text-[#1a1a1a]">Dashboard</h1>
      </div>

      {/* 1. Alertas urgentes */}
      {hayAlertas && (
        <div className="rounded-2xl border border-[#F3C6C6] p-5 space-y-3" style={{ backgroundColor: "#fff0f0" }}>
          <h2 className="text-sm font-bold uppercase tracking-widest text-red-700">
            ⚠️ Alertas y acciones urgentes
          </h2>
          <ul className="space-y-2 text-sm text-red-800">
            {leadsSinRespuesta > 0 && (
              <li className="flex items-center justify-between gap-3">
                <span>
                  <strong>{leadsSinRespuesta}</strong> lead{leadsSinRespuesta === 1 ? "" : "s"} sin respuesta hace
                  más de 48hs
                </span>
                <Link href="/admin/pipeline?sinContactar=1" className={BOTON_VER_ALERTA}>
                  Ver →
                </Link>
              </li>
            )}
            {unidadesConFaltantes.length > 0 && (
              <li className="flex items-center justify-between gap-3">
                <span>
                  <strong>{unidadesConFaltantes.length}</strong> unidad
                  {unidadesConFaltantes.length === 1 ? "" : "es"} con documentación incompleta en secciones
                  críticas
                </span>
                <Link
                  href={
                    unidadesConFaltantes.length === 1
                      ? `/admin/unidades/${unidadesConFaltantes[0].id}`
                      : "#documentacion-faltante"
                  }
                  className={BOTON_VER_ALERTA}
                >
                  Ver →
                </Link>
              </li>
            )}
            {cobrosVencidos > 0 && (
              <li className="flex items-center justify-between gap-3">
                <span>
                  <strong>{cobrosVencidos}</strong> pedido{cobrosVencidos === 1 ? "" : "s"} confirmado
                  {cobrosVencidos === 1 ? "" : "s"} sin anticipo registrado hace más de 7 días
                </span>
                <Link href="/admin/configuraciones" className={BOTON_VER_ALERTA}>
                  Ver →
                </Link>
              </li>
            )}
            {unidadesEnAduanaLargas > 0 && (
              <li className="flex items-center justify-between gap-3">
                <span>
                  <strong>{unidadesEnAduanaLargas}</strong> unidad{unidadesEnAduanaLargas === 1 ? "" : "es"} en
                  aduana hace más de 15 días
                </span>
                <Link href="/admin/unidades?estado=en_aduana" className={BOTON_VER_ALERTA}>
                  Ver →
                </Link>
              </li>
            )}
            {cuotasVencidas > 0 && (
              <li className="flex items-center justify-between gap-3">
                <span>
                  <strong>{cuotasVencidas}</strong> cuota{cuotasVencidas === 1 ? "" : "s"} vencida
                  {cuotasVencidas === 1 ? "" : "s"}
                </span>
                <Link href="/admin/cobranza?tab=gestion&estado=vencido" className={BOTON_VER_ALERTA}>
                  Ver →
                </Link>
              </li>
            )}
            {cuotasVencenSemana > 0 && (
              <li className="flex items-center justify-between gap-3">
                <span>
                  <strong>{cuotasVencenSemana}</strong> cuota{cuotasVencenSemana === 1 ? "" : "s"} vence
                  {cuotasVencenSemana === 1 ? "" : "n"} esta semana
                </span>
                <Link href="/admin/cobranza?tab=gestion&estado=semana" className={BOTON_VER_ALERTA}>
                  Ver →
                </Link>
              </li>
            )}
            {mesAnteriorCierre === null && mesAnteriorTuvoMovimientos > 0 && (
              <li className="flex items-center justify-between gap-3">
                <span>
                  Período {MESES_LABEL[mesAnteriorNum - 1]} {anioAnterior} sin cerrar
                </span>
                <Link href="/admin/cobranza?tab=cierres" className={BOTON_VER_ALERTA}>
                  Ver →
                </Link>
              </li>
            )}
          </ul>
        </div>
      )}

      {/* 2. Agenda del día */}
      <div className="bg-white rounded-2xl border border-[#E5E5E5] p-5">
        <h2 className="text-sm font-bold uppercase tracking-widest text-stone-500 mb-4">
          Agenda del día ({citasHoy.length})
        </h2>
        {citasHoy.length === 0 ? (
          <p className="text-sm text-stone-400">Sin citas agendadas hoy.</p>
        ) : (
          <ul className="divide-y divide-[#F0F0F0]">
            {citasHoy.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/admin/agenda?citaId=${c.id}`}
                  className="py-3 flex items-center justify-between gap-3 text-sm -mx-2 px-2 rounded-lg hover:bg-stone-50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-stone-500 text-xs font-bold whitespace-nowrap">{c.horario}</span>
                    <span className="font-medium text-[#1a1a1a] truncate">{c.nombre}</span>
                  </div>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-bold whitespace-nowrap ${
                      CITA_ESTADO_COLORS[c.estado] ?? "bg-stone-100 text-stone-500"
                    }`}
                  >
                    {CITA_ESTADO_LABELS[c.estado] ?? c.estado}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* 3. KPIs unificados */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <KpiColumn
          title="💼 Ventas"
          items={[
            { label: "Leads nuevos hoy", value: leadsHoy, href: "/admin/pipeline?etapa=nuevo&desde=hoy" },
            {
              label: "En negociación",
              value: leadsEnNegociacion,
              href: "/admin/pipeline?etapa=en_contacto,propuesta_enviada",
            },
            { label: "Ganados este mes", value: leadsGanadosMes, href: "/admin/pipeline?etapa=ganado&periodo=mes" },
          ]}
        />
        <KpiColumn
          title="📦 Operaciones"
          items={[
            { label: "Unidades activas", value: unidadesActivas.length, href: "/admin/unidades?estado=activo" },
            {
              label: "En aduana ahora",
              value: countByEstadoUnidad["en_aduana"] ?? 0,
              href: "/admin/unidades?estado=en_aduana",
            },
            {
              label: "Entregadas este mes",
              value: unidadesEntregadasMes,
              href: "/admin/unidades?estado=entregado&periodo=mes",
            },
          ]}
        />
        <KpiColumn
          title="💰 Financiero"
          items={[
            {
              label: "Cobrado este mes",
              value: formatUSD(cobradoEsteMes),
              href: "/admin/cobranza?tipo=cobro&estado=pagado&periodo=mes",
            },
            { label: "Por cobrar", value: formatUSD(porCobrar), href: "/admin/cobranza?tipo=cobro&estado=pendiente" },
            {
              label: "Vence esta semana",
              value: cuotasVencenSemanaCobro,
              href: "/admin/cobranza?tipo=cobro&estado=pendiente&vence=semana",
            },
            {
              label: "Pagado este mes",
              value: formatUSD(pagadoEsteMes),
              href: "/admin/cobranza?tipo=pago&estado=pagado&periodo=mes",
            },
            { label: "Por pagar", value: formatUSD(porPagar), href: "/admin/cobranza?tipo=pago&estado=pendiente" },
          ]}
        />
      </div>

      {/* 4. Pipeline activo */}
      <div className="bg-white rounded-2xl border border-[#E5E5E5] p-5">
        <h2 className="text-sm font-bold uppercase tracking-widest text-stone-500 mb-4">Pipeline activo</h2>
        {leadsPipelineResumen.length === 0 ? (
          <p className="text-sm text-stone-400">No hay leads activos en el pipeline.</p>
        ) : (
          <ul className="divide-y divide-[#F0F0F0]">
            {leadsPipelineResumen.map((l) => (
              <li key={l.id}>
                <Link
                  href={`/admin/pipeline?leadId=${l.id}`}
                  className="py-3 flex items-center justify-between text-sm -mx-2 px-2 rounded-lg hover:bg-stone-50 transition-colors"
                >
                  <div>
                    <p className="font-medium text-[#1a1a1a]">
                      {l.nombre} {l.apellido ?? ""}
                    </p>
                    <p className="text-xs text-stone-400">{l.createdAt.toLocaleDateString("es-AR")}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-bold ${ETAPA_COLORS[l.etapa as Etapa]}`}>
                    {ETAPA_LABELS[l.etapa as Etapa] ?? l.etapa}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <Link href="/admin/pipeline" className="inline-block mt-4 text-sm text-[#D4B06A] font-bold hover:underline">
          Ver pipeline completo →
        </Link>
      </div>

      {/* 5. Grilla de unidades en movimiento (con tabs Activas/Entregadas + búsqueda) */}
      <div className="bg-white rounded-2xl border border-[#E5E5E5] p-5">
        <h2 className="text-sm font-bold uppercase tracking-widest text-stone-500 mb-4">
          Unidades en movimiento
        </h2>
        <UnidadesEnMovimientoGrid activas={unidadesEnMovimiento} entregadas={unidadesEntregadasGrilla} />
      </div>

      <div className="bg-white rounded-2xl border border-[#E5E5E5] p-5 space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-widest text-stone-500">Resumen del día</h2>
        <div className="bg-[#f5f5f5] rounded-xl p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-stone-500 mb-2">
            Unidades actualizadas (24hs)
          </p>
          {unidadesActualizadas24h.length === 0 ? (
            <p className="text-sm text-stone-400">Sin cambios en las últimas 24hs.</p>
          ) : (
            <ul className="space-y-1">
              {unidadesActualizadas24h.map((u) => (
                <li key={u.id} className="text-sm flex items-center justify-between gap-2">
                  <span className="truncate">
                    {u.numeroUnidad ?? "Sin número"} · {u.cliente.nombre}
                  </span>
                  <span className="text-stone-500 text-xs whitespace-nowrap">
                    {estadoFabricacionLabels[u.estadoFabricacion as EstadoFabricacion] ?? u.estadoFabricacion}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-[#E5E5E5] p-5">
        <h2 className="text-sm font-bold uppercase tracking-widest text-stone-500 mb-4">Envíos activos</h2>
        {enviosActivos.length === 0 ? (
          <p className="text-sm text-stone-400">No hay envíos activos — todos entregados.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E5E5E5] text-left text-stone-500 text-xs uppercase tracking-wide">
                  <th className="px-4 py-3 font-medium">N° PI</th>
                  <th className="px-4 py-3 font-medium">N° Contenedor</th>
                  <th className="px-4 py-3 font-medium">Arribo estimado</th>
                  <th className="px-4 py-3 font-medium">Días restantes</th>
                  <th className="px-4 py-3 font-medium">Unidades</th>
                  <th className="px-4 py-3 font-medium">Estado general</th>
                  <th className="px-4 py-3 font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {enviosActivos.map((e) => (
                  <tr key={e.id} className="border-b border-[#F0F0F0] last:border-0">
                    <td className="px-4 py-3 font-medium text-[#2F2F2F]">{e.numeroPI || "—"}</td>
                    <td className="px-4 py-3 text-stone-600">{e.numeroContenedor || "—"}</td>
                    <td className="px-4 py-3 text-stone-600">
                      {e.fechaArriboEstimado
                        ? e.fechaArriboEstimado.toLocaleDateString("es-AR", { timeZone: "UTC" })
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-stone-600">{diasRestantesLabel(e.dias)}</td>
                    <td className="px-4 py-3 text-stone-600">{e.cantidadUnidades}</td>
                    <td className="px-4 py-3">
                      {e.estado ? (
                        <span className="px-2 py-1 rounded-full text-xs font-bold bg-stone-100 text-stone-600">
                          {estadoFabricacionLabels[e.estado]}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/admin/envios/${e.id}`} className="text-sage-600 hover:text-sage-700 font-medium">
                        Ver detalle
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-[#E5E5E5] p-5">
        <h2 className="text-sm font-bold uppercase tracking-widest text-stone-500 mb-4">Unidades por estado</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {estadoFabricacionOptions.map((estado) => (
            <Link
              key={estado}
              href={`/admin/unidades?estado=${estado}`}
              className={`rounded-xl py-4 text-center transition-opacity hover:opacity-80 ${estadoFabricacionColors[estado]}`}
            >
              <p className="text-2xl font-bold">{countByEstadoUnidad[estado] ?? 0}</p>
              <p className="text-xs mt-1">{estadoFabricacionLabels[estado]}</p>
            </Link>
          ))}
        </div>
      </div>

      <div id="documentacion-faltante" className="bg-white rounded-2xl border border-[#E5E5E5] p-5">
        <h2 className="text-sm font-bold uppercase tracking-widest text-stone-500 mb-4">Documentación faltante</h2>
        {unidadesConFaltantes.length === 0 ? (
          <p className="text-sm text-stone-400">
            Todas las unidades activas tienen su documentación crítica completa.
          </p>
        ) : (
          <div className="space-y-1.5">
            {unidadesConFaltantes.slice(0, MOSTRAR_MAX_FALTANTES).map((u) => (
              <div
                key={u.id}
                className="flex items-center justify-between gap-3 text-sm py-2 px-3 rounded-lg border border-[#F0F0F0]"
              >
                <div className="min-w-0">
                  <p className="font-medium text-[#2F2F2F] truncate">
                    {u.numeroUnidad ?? "Sin número"} · {u.clienteNombre}
                  </p>
                  <p className="text-xs text-stone-400 truncate">
                    Faltan: {u.faltantes.map((k) => SECCION_TITULOS[k] ?? k).join(", ")}
                  </p>
                </div>
                <Link
                  href={`/admin/unidades/${u.id}`}
                  className="flex-shrink-0 px-3 py-1.5 bg-sage-500 hover:bg-sage-600 text-[#2F2F2F] font-bold text-xs rounded-lg transition-colors"
                >
                  Completar
                </Link>
              </div>
            ))}
            {unidadesConFaltantes.length > MOSTRAR_MAX_FALTANTES && (
              <Link href="/admin/unidades" className="block text-sm text-sage-600 hover:underline pt-1">
                Ver las {unidadesConFaltantes.length - MOSTRAR_MAX_FALTANTES} restantes en /admin/unidades →
              </Link>
            )}
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-[#E5E5E5] p-5">
        <h2 className="text-sm font-bold uppercase tracking-widest text-stone-500 mb-4">Pedidos por estado</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {estadoPedidoOptions.map((estado) => (
            <div key={estado} className="text-center bg-[#f5f5f5] rounded-xl py-4">
              <p className="text-2xl font-bold text-[#1a1a1a]">{countByEstado[estado] ?? 0}</p>
              <p className="text-xs text-stone-500 mt-1">{estadoPedidoLabels[estado]}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-[#E5E5E5] p-5">
        <h2 className="text-sm font-bold uppercase tracking-widest text-stone-500 mb-2">
          Google Analytics 4
        </h2>
        <div className="bg-[#f5f5f5] rounded-xl h-48 flex items-center justify-center text-stone-400 text-sm text-center px-6">
          GA4 aún no configurado. Cuando tengas el ID de propiedad, este espacio va a mostrar el
          reporte embebido.
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {accesosRapidos.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="bg-white rounded-2xl border border-[#E5E5E5] p-5 text-center hover:border-[#D4B06A] transition-colors"
          >
            <span className="text-2xl" aria-hidden>
              {item.icon}
            </span>
            <p className="text-sm font-bold text-[#1a1a1a] mt-2">{item.label}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

function KpiColumn({
  title,
  items,
}: {
  title: string;
  items: { label: string; value: string | number; href?: string }[];
}) {
  return (
    <div className="bg-white rounded-2xl border border-[#E5E5E5] p-5 space-y-4">
      <h3 className="text-sm font-bold uppercase tracking-widest text-stone-500">{title}</h3>
      <div className="space-y-3">
        {items.map((item) =>
          item.href ? (
            <Link
              key={item.label}
              href={item.href}
              className="flex items-center justify-between gap-2 -mx-2 px-2 py-1 rounded-lg hover:bg-stone-50 transition-colors"
            >
              <span className="text-sm text-stone-500">{item.label}</span>
              <span className="text-xl font-bold text-[#2F2F2F] whitespace-nowrap">{item.value}</span>
            </Link>
          ) : (
            <div key={item.label} className="flex items-center justify-between gap-2 px-2 py-1">
              <span className="text-sm text-stone-500">{item.label}</span>
              <span className="text-xl font-bold text-[#2F2F2F] whitespace-nowrap">{item.value}</span>
            </div>
          )
        )}
      </div>
    </div>
  );
}
