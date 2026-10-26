import Link from "next/link";
import { db } from "@/lib/db";
import NuevoClienteForm from "@/components/admin/NuevoClienteForm";
import OrigenVisitaChip from "@/components/admin/OrigenVisitaChip";
import {
  ESTADO_CLIENTE_OPTIONS,
  ESTADO_CLIENTE_LABELS,
  ESTADO_CLIENTE_COLORS,
  esEstadoCliente,
  ordenarClientes,
} from "@/lib/clientes/estado";
import { ORIGEN_VISITA_OPTIONS, ORIGEN_VISITA_LABELS, esOrigenVisita } from "@/lib/origen-visita/clasificar";
import { ESTADO_PEDIDO_CANCELADO } from "@/lib/pedido/estado-pedido";

export const dynamic = "force-dynamic";

async function getClientes(where: { estado?: string; origenVisita?: string }) {
  return db.cliente.findMany({
    where,
    include: {
      _count: {
        select: { unidades: true, pedidos: { where: { estadoPedido: { not: ESTADO_PEDIDO_CANCELADO } } } },
      },
    },
  });
}

const selectClass = "rounded-lg border border-[#E5E5E5] px-3 py-2 text-sm text-[#2F2F2F] bg-white";

export default async function AdminClientesPage({
  searchParams,
}: {
  searchParams?: Promise<{ estado?: string; origenVisita?: string }>;
}) {
  const sp = (await searchParams) ?? {};
  const estado = esEstadoCliente(sp.estado) ? sp.estado : undefined;
  const origenVisita = esOrigenVisita(sp.origenVisita) ? sp.origenVisita : undefined;
  const hayFiltros = Boolean(estado || origenVisita);

  // Primero los "pedido iniciado" (hay que presupuestarlos), después el resto.
  const clientes = ordenarClientes(
    await getClientes({ ...(estado ? { estado } : {}), ...(origenVisita ? { origenVisita } : {}) })
  );

  return (
    <div className="max-w-6xl mx-auto px-6 py-12 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sage-500 text-xs font-bold uppercase tracking-widest mb-1">
            Panel MOVARA
          </p>
          <h1 className="text-2xl font-bold text-[#2F2F2F]">Clientes</h1>
        </div>
        <NuevoClienteForm />
      </div>

      <form method="GET" action="/admin/clientes" className="flex flex-wrap items-end gap-3">
        <label className="block space-y-1">
          <span className="text-xs font-medium text-stone-500">Estado</span>
          <select name="estado" defaultValue={estado ?? ""} className={selectClass}>
            <option value="">Todos</option>
            {ESTADO_CLIENTE_OPTIONS.map((e) => (
              <option key={e} value={e}>
                {ESTADO_CLIENTE_LABELS[e]}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1">
          <span className="text-xs font-medium text-stone-500">Origen web</span>
          <select name="origenVisita" defaultValue={origenVisita ?? ""} className={selectClass}>
            <option value="">Todos</option>
            {ORIGEN_VISITA_OPTIONS.map((o) => (
              <option key={o} value={o}>
                {ORIGEN_VISITA_LABELS[o]}
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
          <Link href="/admin/clientes" className="text-sm text-stone-500 hover:text-stone-700 px-1">
            Limpiar filtros
          </Link>
        )}
      </form>

      {clientes.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E5E5E5] p-10 text-center text-stone-500 text-sm">
          {hayFiltros ? "Ningún cliente coincide con los filtros." : "Todavía no hay clientes cargados."}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#E5E5E5] overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E5E5E5] text-left text-stone-500 text-xs uppercase tracking-wide">
                <th className="px-5 py-3 font-medium">Nombre</th>
                <th className="px-5 py-3 font-medium">Estado</th>
                <th className="px-5 py-3 font-medium">Email</th>
                <th className="px-5 py-3 font-medium">Teléfono</th>
                <th className="px-5 py-3 font-medium">Origen web</th>
                <th className="px-5 py-3 font-medium">Pedidos</th>
                <th className="px-5 py-3 font-medium">Unidades</th>
                <th className="px-5 py-3 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {clientes.map((c) => (
                <tr key={c.id} className="border-b border-[#F0F0F0] last:border-0">
                  <td className="px-5 py-3 font-medium text-[#2F2F2F]">{c.nombre}</td>
                  <td className="px-5 py-3 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-bold ${
                        esEstadoCliente(c.estado) ? ESTADO_CLIENTE_COLORS[c.estado] : ESTADO_CLIENTE_COLORS.interesado
                      }`}
                    >
                      {esEstadoCliente(c.estado) ? ESTADO_CLIENTE_LABELS[c.estado] : c.estado}
                    </span>
                    {c.estadoManual && (
                      <span className="ml-1.5 text-[11px] font-medium text-stone-500" title="Estado fijado a mano">
                        manual
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-stone-600">{c.email || "—"}</td>
                  <td className="px-5 py-3 text-stone-600">{c.telefono || "—"}</td>
                  <td className="px-5 py-3">
                    <OrigenVisitaChip origenVisita={c.origenVisita} campana={c.campana} />
                  </td>
                  <td className="px-5 py-3 text-stone-600">{c._count.pedidos}</td>
                  <td className="px-5 py-3 text-stone-600">{c._count.unidades}</td>
                  <td className="px-5 py-3">
                    <Link
                      href={`/admin/clientes/${c.id}`}
                      className="text-sage-600 hover:text-sage-700 font-medium"
                    >
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
  );
}
