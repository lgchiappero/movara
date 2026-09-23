import Link from "next/link";
import { db } from "@/lib/db";
import { estadoFabricacionOptions, estadoFabricacionLabels, type EstadoFabricacion } from "@/lib/envios/constantes";
import NuevaUnidadForm from "@/components/admin/NuevaUnidadForm";

export const dynamic = "force-dynamic";

export default async function AdminUnidadesPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string; clienteId?: string; envioId?: string; provincia?: string }>;
}) {
  const sp = await searchParams;

  const where = {
    ...(sp.estado ? { estadoFabricacion: sp.estado } : {}),
    ...(sp.clienteId ? { clienteId: sp.clienteId } : {}),
    ...(sp.envioId ? { envioId: sp.envioId } : {}),
    ...(sp.provincia ? { provinciaDestino: sp.provincia } : {}),
  };

  const [unidades, clientes, envios, provinciasRows] = await Promise.all([
    db.unidad.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { cliente: { select: { nombre: true } }, envio: { select: { numeroPI: true } } },
    }),
    db.cliente.findMany({ orderBy: { nombre: "asc" }, select: { id: true, nombre: true } }),
    db.envio.findMany({ orderBy: { createdAt: "desc" }, select: { id: true, numeroPI: true } }),
    db.unidad.findMany({
      where: { provinciaDestino: { not: null } },
      distinct: ["provinciaDestino"],
      select: { provinciaDestino: true },
      orderBy: { provinciaDestino: "asc" },
    }),
  ]);

  const provincias = provinciasRows.map((r) => r.provinciaDestino!).filter(Boolean);
  const hayFiltros = Boolean(sp.estado || sp.clienteId || sp.envioId || sp.provincia);

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <p className="text-sage-500 text-xs font-bold uppercase tracking-widest mb-1">
            Panel MOVARA
          </p>
          <h1 className="text-2xl font-bold text-[#2F2F2F]">Unidades</h1>
        </div>
        <NuevaUnidadForm
          clientes={clientes}
          envios={envios.map((e) => ({ id: e.id, numeroPI: e.numeroPI }))}
        />
      </div>

      <form action="/admin/unidades" method="GET" className="flex flex-wrap items-end gap-3 mb-6">
        <label className="block space-y-1">
          <span className="text-xs font-medium text-stone-500">Estado</span>
          <select
            name="estado"
            defaultValue={sp.estado ?? ""}
            className="rounded-lg border border-[#E5E5E5] px-3 py-2 text-sm text-[#2F2F2F] bg-white"
          >
            <option value="">Todos</option>
            {estadoFabricacionOptions.map((e) => (
              <option key={e} value={e}>
                {estadoFabricacionLabels[e]}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1">
          <span className="text-xs font-medium text-stone-500">Cliente</span>
          <select
            name="clienteId"
            defaultValue={sp.clienteId ?? ""}
            className="rounded-lg border border-[#E5E5E5] px-3 py-2 text-sm text-[#2F2F2F] bg-white"
          >
            <option value="">Todos</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1">
          <span className="text-xs font-medium text-stone-500">Envío</span>
          <select
            name="envioId"
            defaultValue={sp.envioId ?? ""}
            className="rounded-lg border border-[#E5E5E5] px-3 py-2 text-sm text-[#2F2F2F] bg-white"
          >
            <option value="">Todos</option>
            {envios.map((e) => (
              <option key={e.id} value={e.id}>
                {e.numeroPI ?? `Envío ${e.id.slice(-6)}`}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1">
          <span className="text-xs font-medium text-stone-500">Provincia</span>
          <select
            name="provincia"
            defaultValue={sp.provincia ?? ""}
            className="rounded-lg border border-[#E5E5E5] px-3 py-2 text-sm text-[#2F2F2F] bg-white"
          >
            <option value="">Todas</option>
            {provincias.map((p) => (
              <option key={p} value={p}>
                {p}
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
          <Link href="/admin/unidades" className="text-sm text-stone-500 hover:text-stone-700 px-1">
            Limpiar filtros
          </Link>
        )}
      </form>

      {unidades.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E5E5E5] p-10 text-center text-stone-500 text-sm">
          {hayFiltros ? "Ninguna unidad coincide con los filtros." : "Todavía no hay unidades cargadas."}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#E5E5E5] overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E5E5E5] text-left text-stone-500 text-xs uppercase tracking-wide">
                <th className="px-4 py-3 font-medium">N° Unidad</th>
                <th className="px-4 py-3 font-medium">Cliente</th>
                <th className="px-4 py-3 font-medium">Modelo</th>
                <th className="px-4 py-3 font-medium">Envío</th>
                <th className="px-4 py-3 font-medium">Estado fabricación</th>
                <th className="px-4 py-3 font-medium">Destino</th>
                <th className="px-4 py-3 font-medium">Precio cliente USD</th>
                <th className="px-4 py-3 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {unidades.map((u) => (
                <tr key={u.id} className="border-b border-[#F0F0F0] last:border-0">
                  <td className="px-4 py-3 font-medium text-[#2F2F2F]">{u.numeroUnidad ?? "—"}</td>
                  <td className="px-4 py-3 text-stone-600">{u.cliente.nombre}</td>
                  <td className="px-4 py-3 text-stone-600">{u.modelo ?? "—"}</td>
                  <td className="px-4 py-3 text-stone-600">{u.envio?.numeroPI ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 rounded-full text-xs font-bold bg-stone-100 text-stone-600">
                      {estadoFabricacionLabels[u.estadoFabricacion as EstadoFabricacion] ?? u.estadoFabricacion}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-stone-600">
                    {[u.localidadDestino, u.provinciaDestino].filter(Boolean).join(", ") || "—"}
                  </td>
                  <td className="px-4 py-3 text-stone-600">
                    {u.precioCliente != null ? `USD ${u.precioCliente.toLocaleString("es-AR")}` : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/unidades/${u.id}`}
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
