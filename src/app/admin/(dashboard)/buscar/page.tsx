import Link from "next/link";
import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import {
  estadoFabricacionOptions,
  estadoFabricacionLabels,
  type EstadoFabricacion,
} from "@/lib/envios/constantes";
import { estadoGeneralEnvio } from "@/lib/envios/estado-general";

export const dynamic = "force-dynamic";

const inputClass =
  "w-full rounded-lg border border-[#E5E5E5] px-3 py-2 text-sm text-[#1a1a1a] bg-white focus:outline-none focus:ring-2 focus:ring-[#D4B06A]";

function fechaWhere(desde?: string, hasta?: string): Prisma.DateTimeFilter | undefined {
  if (!desde && !hasta) return undefined;
  const filtro: Prisma.DateTimeFilter = {};
  if (desde) filtro.gte = new Date(`${desde}T00:00:00`);
  if (hasta) filtro.lte = new Date(`${hasta}T23:59:59`);
  return filtro;
}

export default async function AdminBuscarPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; desde?: string; hasta?: string; estado?: string }>;
}) {
  const { q, desde, hasta, estado } = await searchParams;
  const query = q?.trim() ?? "";
  const rango = fechaWhere(desde, hasta);
  const estadoValido = estado && (estadoFabricacionOptions as readonly string[]).includes(estado) ? estado : undefined;

  const hayFiltros = Boolean(query || desde || hasta || estadoValido);

  const [clientes, unidades, enviosRaw] = hayFiltros
    ? await Promise.all([
        db.cliente.findMany({
          where: {
            ...(query ? { nombre: { contains: query, mode: "insensitive" } } : {}),
            ...(rango ? { createdAt: rango } : {}),
          },
          orderBy: { createdAt: "desc" },
          take: 30,
        }),
        db.unidad.findMany({
          where: {
            ...(query
              ? {
                  OR: [
                    { numeroUnidad: { contains: query, mode: "insensitive" } },
                    { cliente: { nombre: { contains: query, mode: "insensitive" } } },
                  ],
                }
              : {}),
            ...(rango ? { createdAt: rango } : {}),
            ...(estadoValido ? { estadoFabricacion: estadoValido } : {}),
          },
          include: { cliente: { select: { nombre: true } } },
          orderBy: { createdAt: "desc" },
          take: 30,
        }),
        db.envio.findMany({
          where: {
            ...(query
              ? {
                  OR: [
                    { numeroPI: { contains: query, mode: "insensitive" } },
                    { numeroContenedor: { contains: query, mode: "insensitive" } },
                    { numeroBL: { contains: query, mode: "insensitive" } },
                  ],
                }
              : {}),
            ...(rango ? { createdAt: rango } : {}),
          },
          include: { unidades: { select: { estadoFabricacion: true } } },
          orderBy: { createdAt: "desc" },
          take: 30,
        }),
      ])
    : [[], [], []];

  // El estado de un envío es derivado (unidad menos avanzada) — el filtro
  // por estado se aplica acá, después de traerlo, no en el WHERE de Prisma.
  const envios = estadoValido
    ? enviosRaw.filter((e) => estadoGeneralEnvio(e.unidades) === estadoValido)
    : enviosRaw;

  const sinResultados = hayFiltros && clientes.length === 0 && unidades.length === 0 && envios.length === 0;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <p className="text-[#D4B06A] text-xs font-bold uppercase tracking-widest mb-1">Panel MOVARA</p>
        <h1 className="text-2xl font-bold text-[#1a1a1a]">Búsqueda global</h1>
        <p className="text-sm text-stone-500 mt-1">
          Buscá por cliente, número de unidad (MOV-UNIDAD-...), PI, contenedor o BL.
        </p>
      </div>

      <form
        method="GET"
        className="bg-white rounded-2xl border border-[#E5E5E5] p-5 grid grid-cols-1 sm:grid-cols-4 gap-4"
      >
        <label className="block space-y-1.5 sm:col-span-2">
          <span className="text-xs font-medium text-stone-500">Buscar</span>
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Cliente, MOV-UNIDAD-2026-001, PI, contenedor, BL..."
            className={inputClass}
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-stone-500">Desde</span>
          <input type="date" name="desde" defaultValue={desde} className={inputClass} />
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-stone-500">Hasta</span>
          <input type="date" name="hasta" defaultValue={hasta} className={inputClass} />
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-stone-500">Estado (unidades / envíos)</span>
          <select name="estado" defaultValue={estadoValido ?? ""} className={inputClass}>
            <option value="">Todos</option>
            {estadoFabricacionOptions.map((e) => (
              <option key={e} value={e}>
                {estadoFabricacionLabels[e]}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-end gap-2">
          <button
            type="submit"
            className="flex-1 py-2 bg-[#1a1a1a] hover:bg-[#2a2a2a] text-white font-bold text-sm rounded-lg transition-colors"
          >
            Buscar
          </button>
          {hayFiltros && (
            <a
              href="/admin/buscar"
              className="flex-1 text-center py-2 border border-stone-300 text-stone-600 hover:bg-stone-50 font-medium text-sm rounded-lg transition-colors"
            >
              Limpiar
            </a>
          )}
        </div>
      </form>

      {!hayFiltros && (
        <div className="bg-white rounded-2xl border border-[#E5E5E5] p-10 text-center text-stone-500 text-sm">
          Escribí algo o elegí un filtro para empezar a buscar.
        </div>
      )}

      {sinResultados && (
        <div className="bg-white rounded-2xl border border-[#E5E5E5] p-10 text-center text-stone-500 text-sm">
          No encontramos nada que coincida con esa búsqueda.
        </div>
      )}

      {clientes.length > 0 && (
        <ResultadoSeccion titulo={`Clientes (${clientes.length})`}>
          <div className="space-y-1.5">
            {clientes.map((c) => (
              <Link
                key={c.id}
                href={`/admin/clientes/${c.id}`}
                className="flex items-center justify-between gap-3 text-sm py-2 px-3 rounded-lg border border-[#F0F0F0] hover:bg-stone-50 transition-colors"
              >
                <span className="font-medium text-[#2F2F2F]">{c.nombre}</span>
                <span className="text-stone-400 text-xs">{c.email || c.telefono || "—"}</span>
              </Link>
            ))}
          </div>
        </ResultadoSeccion>
      )}

      {unidades.length > 0 && (
        <ResultadoSeccion titulo={`Unidades (${unidades.length})`}>
          <div className="space-y-1.5">
            {unidades.map((u) => (
              <Link
                key={u.id}
                href={`/admin/unidades/${u.id}`}
                className="flex items-center justify-between gap-3 text-sm py-2 px-3 rounded-lg border border-[#F0F0F0] hover:bg-stone-50 transition-colors"
              >
                <div>
                  <span className="font-medium text-[#2F2F2F]">{u.numeroUnidad ?? "Sin número"}</span>
                  <span className="text-stone-400 ml-2">{u.cliente.nombre}</span>
                </div>
                <span className="px-2 py-1 rounded-full text-xs font-bold bg-stone-100 text-stone-600">
                  {estadoFabricacionLabels[u.estadoFabricacion as EstadoFabricacion] ?? u.estadoFabricacion}
                </span>
              </Link>
            ))}
          </div>
        </ResultadoSeccion>
      )}

      {envios.length > 0 && (
        <ResultadoSeccion titulo={`Envíos (${envios.length})`}>
          <div className="space-y-1.5">
            {envios.map((e) => {
              const estadoGeneral = estadoGeneralEnvio(e.unidades);
              return (
                <Link
                  key={e.id}
                  href={`/admin/envios/${e.id}`}
                  className="flex items-center justify-between gap-3 text-sm py-2 px-3 rounded-lg border border-[#F0F0F0] hover:bg-stone-50 transition-colors"
                >
                  <div>
                    <span className="font-medium text-[#2F2F2F]">{e.numeroPI || "Sin PI"}</span>
                    <span className="text-stone-400 ml-2">{e.numeroContenedor || ""}</span>
                  </div>
                  {estadoGeneral && (
                    <span className="px-2 py-1 rounded-full text-xs font-bold bg-stone-100 text-stone-600">
                      {estadoFabricacionLabels[estadoGeneral]}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </ResultadoSeccion>
      )}
    </div>
  );
}

function ResultadoSeccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-[#E5E5E5] p-5">
      <h2 className="text-sm font-bold uppercase tracking-widest text-stone-500 mb-4">{titulo}</h2>
      {children}
    </div>
  );
}
