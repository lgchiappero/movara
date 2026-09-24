import Link from "next/link";
import { db } from "@/lib/db";
import { estadoPedidoOptions, estadoPedidoLabels, type EstadoPedido } from "@/lib/pedido/estado-pedido";
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
import { estadoGeneralEnvio } from "@/lib/envios/estado-general";
import { diasHasta, seccionesFaltantes } from "@/lib/dashboard/calc";
import { hoyFechaKey, fechaKeyToDate } from "@/lib/agenda/fecha";

export const dynamic = "force-dynamic";

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

// Cita.fecha se guarda a medianoche UTC (date-only) — mismo criterio que
// src/lib/agenda/disponibilidad.ts, no el huso horario local del server.
function startOfMonthUTC(d: Date): Date {
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), 1));
}
function startOfNextMonthUTC(d: Date): Date {
  return new Date(Date.UTC(d.getFullYear(), d.getMonth() + 1, 1));
}

const SECCION_TITULOS: Record<string, string> = Object.fromEntries(
  SECCIONES_UNIDAD.map((s) => [s.key, s.titulo])
);

function diasRestantesLabel(dias: number | null): string {
  if (dias === null) return "—";
  if (dias < 0) return "Vencido";
  if (dias === 0) return "Hoy";
  return `${dias} día${dias === 1 ? "" : "s"}`;
}

export default async function AdminDashboardPage() {
  const now = new Date();
  const hace48hs = new Date(now.getTime() - 48 * 60 * 60 * 1000);
  const hace24hs = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const fechaHoy = fechaKeyToDate(hoyFechaKey());

  const [
    leadsHoy,
    leadsMes,
    estadoCounts,
    ultimasConsultas,
    session,
    unidadesActivas,
    unidadesActualizadas24h,
    unidadesPorEstadoRaw,
    envios,
    citasHoy,
    leadsSinRespuesta,
    citasMes,
    clientesTotal,
  ] = await Promise.all([
    db.lead.count({ where: { createdAt: { gte: startOfDay(now) } } }),
    db.lead.count({ where: { createdAt: { gte: startOfMonth(now) } } }),
    db.configuracionPedido.groupBy({ by: ["estadoPedido"], _count: { _all: true } }),
    db.configuracionPedido.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, clienteNombre: true, numeroConsulta: true, estadoPedido: true, createdAt: true },
    }),
    getAdminUser(),
    db.unidad.findMany({
      where: { estadoFabricacion: { not: "entregado" } },
      include: { documentos: { select: { seccion: true } }, cliente: { select: { nombre: true } } },
      orderBy: { createdAt: "desc" },
    }),
    db.unidad.findMany({
      where: { updatedAt: { gte: hace24hs } },
      select: { id: true, numeroUnidad: true, estadoFabricacion: true, cliente: { select: { nombre: true } } },
      orderBy: { updatedAt: "desc" },
      take: 10,
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
    db.cita.count({ where: { fecha: { gte: startOfMonthUTC(now), lt: startOfNextMonthUTC(now) } } }),
    db.cliente.count(),
  ]);

  const rol = session?.rol ?? "vendedor";
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

  const enviosConDerivados = envios.map((e) => ({
    ...e,
    estado: estadoGeneralEnvio(e.unidades),
    dias: diasHasta(e.fechaArriboEstimado, now),
    cantidadUnidades: e.unidades.length,
  }));
  const enviosActivos = enviosConDerivados.filter((e) => e.estado !== "entregado");
  const enviosProximosArribo = enviosConDerivados.filter(
    (e) => e.dias !== null && e.dias >= 0 && e.dias <= 7
  );

  const citasHoyPendientes = citasHoy.filter((c) => c.estado === "confirmada");

  const hayAlertas =
    unidadesConFaltantes.length > 0 ||
    enviosProximosArribo.length > 0 ||
    citasHoyPendientes.length > 0 ||
    leadsSinRespuesta > 0;

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

      {hayAlertas && (
        <div className="rounded-2xl border border-[#F3C6C6] p-5 space-y-3" style={{ backgroundColor: "#fff0f0" }}>
          <h2 className="text-sm font-bold uppercase tracking-widest text-red-700">
            ⚠️ Alertas y acciones urgentes
          </h2>
          <ul className="space-y-2 text-sm text-red-800">
            {unidadesConFaltantes.length > 0 && (
              <li>
                <strong>{unidadesConFaltantes.length}</strong> unidad
                {unidadesConFaltantes.length === 1 ? "" : "es"} con documentación incompleta en secciones
                críticas —{" "}
                <a href="#documentacion-faltante" className="underline font-medium">
                  ver detalle
                </a>
              </li>
            )}
            {enviosProximosArribo.length > 0 && (
              <li>
                <strong>{enviosProximosArribo.length}</strong> envío{enviosProximosArribo.length === 1 ? "" : "s"}{" "}
                con arribo en los próximos 7 días —{" "}
                <Link href="/admin/envios" className="underline font-medium">
                  ver envíos
                </Link>
              </li>
            )}
            {citasHoyPendientes.length > 0 && (
              <li>
                <strong>{citasHoyPendientes.length}</strong> cita{citasHoyPendientes.length === 1 ? "" : "s"} de
                showroom pendientes hoy —{" "}
                <Link href="/admin/agenda" className="underline font-medium">
                  ver agenda
                </Link>
              </li>
            )}
            {leadsSinRespuesta > 0 && (
              <li>
                <strong>{leadsSinRespuesta}</strong> lead{leadsSinRespuesta === 1 ? "" : "s"} sin respuesta hace
                más de 48hs —{" "}
                <Link href="/admin/leads?sinResponder=1" className="underline font-medium">
                  ver leads
                </Link>
              </li>
            )}
          </ul>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-[#E5E5E5] p-5 space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-widest text-stone-500">Resumen del día</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-[#f5f5f5] rounded-xl p-4 flex flex-col justify-center">
            <p className="text-3xl font-bold text-[#1a1a1a]">{leadsHoy}</p>
            <p className="text-sm text-stone-500 mt-1">Leads nuevos hoy</p>
          </div>
          <div className="bg-[#f5f5f5] rounded-xl p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-stone-500 mb-2">
              Citas de showroom hoy ({citasHoy.length})
            </p>
            {citasHoy.length === 0 ? (
              <p className="text-sm text-stone-400">Sin citas agendadas hoy.</p>
            ) : (
              <ul className="space-y-1">
                {citasHoy.map((c) => (
                  <li key={c.id} className="text-sm flex items-center justify-between gap-2">
                    <span className="truncate">{c.nombre}</span>
                    <span className="text-stone-500 text-xs whitespace-nowrap">{c.horario}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
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

      <div>
        <h2 className="text-sm font-bold uppercase tracking-widest text-stone-500 mb-4">Métricas generales</h2>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          <StatCard label="Clientes" value={clientesTotal} />
          <StatCard label="Unidades activas" value={unidadesActivas.length} />
          <StatCard label="Envíos activos" value={enviosActivos.length} />
          <StatCard label="Leads del mes" value={leadsMes} />
          <StatCard label="Citas del mes" value={citasMes} />
        </div>
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
        <h2 className="text-sm font-bold uppercase tracking-widest text-stone-500 mb-4">Últimas consultas</h2>
        {ultimasConsultas.length === 0 ? (
          <p className="text-sm text-stone-400">Todavía no llegó ninguna consulta.</p>
        ) : (
          <ul className="divide-y divide-[#F0F0F0]">
            {ultimasConsultas.map((c) => (
              <li key={c.id} className="py-3 flex items-center justify-between text-sm">
                <div>
                  <p className="font-medium text-[#1a1a1a]">{c.clienteNombre}</p>
                  <p className="text-xs text-stone-400 font-mono">{c.numeroConsulta ?? "—"}</p>
                </div>
                <div className="text-right">
                  <span className="px-2 py-1 rounded-full text-xs font-bold bg-[#f5f5f5] text-stone-600">
                    {estadoPedidoLabels[c.estadoPedido as EstadoPedido] ?? c.estadoPedido}
                  </span>
                  <p className="text-xs text-stone-400 mt-1">
                    {c.createdAt.toLocaleDateString("es-AR")}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
        {isAllowedForRole(rol, "/admin/configuraciones") && (
          <Link
            href="/admin/configuraciones"
            className="inline-block mt-4 text-sm text-[#D4B06A] font-bold hover:underline"
          >
            Ver todos los pedidos →
          </Link>
        )}
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

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white rounded-2xl border border-[#E5E5E5] p-5">
      <p className="text-3xl font-bold text-[#1a1a1a]">{value}</p>
      <p className="text-sm text-stone-500 mt-1">{label}</p>
    </div>
  );
}
