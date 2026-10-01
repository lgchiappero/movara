import Link from "next/link";
import { db } from "@/lib/db";
import { ETAPA_OPTIONS, ETAPA_LABELS, ORIGEN_OPTIONS, ORIGEN_LABELS, type Etapa, type Origen } from "@/lib/leads/constantes";
import { tasaConversion } from "@/lib/leads/calc";
import PipelineBoard from "@/components/admin/PipelineBoard";
import PaginacionLinks from "@/components/admin/PaginacionLinks";
import { getAdminUser } from "@/lib/admin/current-user";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

const TABS = ["todos", ...ETAPA_OPTIONS] as const;

export default async function AdminPipelinePage({
  searchParams,
}: {
  searchParams: Promise<{
    etapa?: string;
    vendedorId?: string;
    origen?: string;
    desde?: string;
    periodo?: string;
    sinContactar?: string;
    leadId?: string;
    page?: string;
  }>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);

  // "etapa" acepta una lista separada por comas (ej. desde los KPIs del
  // dashboard: etapa=en_contacto,propuesta_enviada) además del valor único
  // de siempre. Con exactamente 1 etapa válida se mantiene el shape previo
  // (etapa: string) para no romper los tabs ni los tests existentes; con 2+
  // se arma un { in: [...] }.
  const etapasValidas = (sp.etapa ?? "")
    .split(",")
    .map((e) => e.trim())
    .filter((e): e is Etapa => (ETAPA_OPTIONS as readonly string[]).includes(e));
  const etapaValida = etapasValidas.length === 1 ? etapasValidas[0] : undefined;
  const etapaWhere =
    etapasValidas.length === 1
      ? { etapa: etapasValidas[0] }
      : etapasValidas.length > 1
        ? { etapa: { in: etapasValidas } }
        : {};

  const origenValido = (ORIGEN_OPTIONS as readonly string[]).includes(sp.origen ?? "")
    ? (sp.origen as Origen)
    : undefined;

  const now = new Date();
  const hoyParaFiltro = startOfDay(now);
  const inicioMesParaFiltro = startOfMonth(now);

  // "desde=hoy" y "periodo=mes" filtran por createdAt — mismo criterio que
  // usan las tarjetas del dashboard para "Leads nuevos hoy" y "Ganados este
  // mes". Si llegaran los dos a la vez, "desde=hoy" gana (es el filtro más
  // específico).
  const fechaWhere =
    sp.desde === "hoy"
      ? { createdAt: { gte: hoyParaFiltro } }
      : sp.periodo === "mes"
        ? { createdAt: { gte: inicioMesParaFiltro } }
        : {};

  const sinContactarWhere = sp.sinContactar === "1" ? { contactado: false } : {};

  const where = {
    ...etapaWhere,
    ...(sp.vendedorId ? { vendedorId: sp.vendedorId } : {}),
    ...(origenValido ? { origen: origenValido } : {}),
    ...fechaWhere,
    ...sinContactarWhere,
  };

  const hoy = hoyParaFiltro;
  const inicioMes = inicioMesParaFiltro;

  const [session, leads, totalFiltrados, vendedores, totalActivos, nuevosHoy, enPropuesta, ganadosMes, totalMes] =
    await Promise.all([
      getAdminUser(),
      db.lead.findMany({ where, orderBy: { createdAt: "desc" }, take: PAGE_SIZE, skip: (page - 1) * PAGE_SIZE }),
      db.lead.count({ where }),
      db.adminUser.findMany({
        where: { rol: { in: ["vendedor", "admin"] }, activo: true },
        select: { id: true, nombre: true },
        orderBy: { nombre: "asc" },
      }),
      db.lead.count({ where: { etapa: { notIn: ["ganado", "perdido"] } } }),
      db.lead.count({ where: { createdAt: { gte: hoy } } }),
      db.lead.count({ where: { etapa: "propuesta_enviada" } }),
      db.lead.count({ where: { etapa: "ganado", createdAt: { gte: inicioMes } } }),
      db.lead.count({ where: { createdAt: { gte: inicioMes } } }),
    ]);

  const totalPages = Math.max(1, Math.ceil(totalFiltrados / PAGE_SIZE));

  // "Del mes" acá siempre se refiere a la cohorte de leads CREADOS este mes
  // (no a cuándo cambiaron de etapa) — Lead no tiene un timestamp de "pasó a
  // ganado", así que es la única definición coherente sin ampliar el schema
  // más allá del pedido.
  const tasa = tasaConversion(ganadosMes, totalMes);

  const hayFiltros = Boolean(
    etapasValidas.length > 0 ||
      sp.vendedorId ||
      origenValido ||
      sp.desde === "hoy" ||
      sp.periodo === "mes" ||
      sp.sinContactar === "1"
  );

  function buildHref(nuevaPagina: number): string {
    const params = new URLSearchParams();
    if (etapaValida) params.set("etapa", etapaValida);
    if (sp.vendedorId) params.set("vendedorId", sp.vendedorId);
    if (origenValido) params.set("origen", origenValido);
    if (sp.desde) params.set("desde", sp.desde);
    if (sp.periodo) params.set("periodo", sp.periodo);
    if (sp.sinContactar) params.set("sinContactar", sp.sinContactar);
    if (nuevaPagina > 1) params.set("page", String(nuevaPagina));
    const qs = params.toString();
    return `/admin/pipeline${qs ? `?${qs}` : ""}`;
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-12 space-y-6">
      <div>
        <p className="text-sage-500 text-xs font-bold uppercase tracking-widest mb-1">Panel MOVARA</p>
        <h1 className="text-2xl font-bold text-[#2F2F2F]">Pipeline de ventas</h1>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <MetricaCard label="Activos" value={totalActivos} />
        <MetricaCard label="Nuevos hoy" value={nuevosHoy} />
        <MetricaCard label="En propuesta" value={enPropuesta} />
        <MetricaCard label="Ganados este mes" value={ganadosMes} />
        <MetricaCard label="Conversión del mes" value={tasa !== null ? `${Math.round(tasa * 100)}%` : "—"} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {TABS.map((tab) => {
          const active = tab === "todos" ? !etapaValida : etapaValida === tab;
          const params = new URLSearchParams();
          if (tab !== "todos") params.set("etapa", tab);
          if (sp.vendedorId) params.set("vendedorId", sp.vendedorId);
          if (origenValido) params.set("origen", origenValido);
          const qs = params.toString();
          return (
            <Link
              key={tab}
              href={`/admin/pipeline${qs ? `?${qs}` : ""}`}
              className={`px-4 py-2 rounded-full text-sm font-bold transition-colors ${
                active
                  ? "bg-[#2F2F2F] text-white"
                  : "bg-white border border-[#E5E5E5] text-stone-600 hover:border-stone-300"
              }`}
            >
              {tab === "todos" ? "Todos" : ETAPA_LABELS[tab]}
            </Link>
          );
        })}
      </div>

      <form method="GET" action="/admin/pipeline" className="flex flex-wrap items-end gap-3">
        {etapaValida && <input type="hidden" name="etapa" value={etapaValida} />}
        <label className="block space-y-1">
          <span className="text-xs font-medium text-stone-500">Vendedor</span>
          <select
            name="vendedorId"
            defaultValue={sp.vendedorId ?? ""}
            className="rounded-lg border border-[#E5E5E5] px-3 py-2 text-sm text-[#2F2F2F] bg-white"
          >
            <option value="">Todos</option>
            {vendedores.map((v) => (
              <option key={v.id} value={v.id}>
                {v.nombre}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1">
          <span className="text-xs font-medium text-stone-500">Origen</span>
          <select
            name="origen"
            defaultValue={origenValido ?? ""}
            className="rounded-lg border border-[#E5E5E5] px-3 py-2 text-sm text-[#2F2F2F] bg-white"
          >
            <option value="">Todos</option>
            {ORIGEN_OPTIONS.map((o) => (
              <option key={o} value={o}>
                {ORIGEN_LABELS[o]}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="px-4 py-2 bg-[#2F2F2F] text-white font-medium text-sm rounded-lg hover:bg-[#1a1a1a] transition-colors"
        >
          Filtrar
        </button>
        {hayFiltros && (
          <Link href="/admin/pipeline" className="text-sm text-stone-500 hover:text-stone-700 px-1">
            Limpiar filtros
          </Link>
        )}
      </form>

      {leads.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E5E5E5] p-10 text-center text-stone-500 text-sm">
          {hayFiltros ? "Ningún lead coincide con los filtros." : "Todavía no hay leads cargados."}
        </div>
      ) : (
        <PipelineBoard
          leads={leads.map((l) => ({
            id: l.id,
            nombre: l.nombre,
            apellido: l.apellido,
            dni: l.dni,
            telefono: l.telefono,
            email: l.email,
            provincia: l.provincia,
            mensaje: l.mensaje,
            createdAt: l.createdAt.toISOString(),
            contactado: l.contactado,
            contactadoEn: l.contactadoEn?.toISOString() ?? null,
            etapa: l.etapa,
            origen: l.origen,
            vendedorId: l.vendedorId,
            notasVenta: l.notasVenta,
            motivoPerdida: l.motivoPerdida,
            clienteId: l.clienteId,
            valorEstimado: l.valorEstimado,
          }))}
          vendedores={vendedores}
          highlightLeadId={sp.leadId ?? null}
          rol={session?.rol ?? "vendedor"}
        />
      )}

      <PaginacionLinks page={page} totalPages={totalPages} buildHref={buildHref} />
    </div>
  );
}

function MetricaCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="bg-white rounded-2xl border border-[#E5E5E5] p-5">
      <p className="text-2xl font-bold text-[#2F2F2F]">{value}</p>
      <p className="text-xs text-stone-500 mt-1">{label}</p>
    </div>
  );
}
