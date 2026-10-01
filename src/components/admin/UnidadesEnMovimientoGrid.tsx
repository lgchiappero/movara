"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { estadoFabricacionLabels, estadoFabricacionColors, type EstadoFabricacion } from "@/lib/envios/constantes";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";

export type UnidadMovimiento = {
  id: string;
  numeroUnidad: string | null;
  clienteNombre: string;
  modelo: string | null;
  envioNumeroPI: string | null;
  estadoFabricacion: string;
  tienePrecio: boolean;
  fechaEmbarque: string | null;
  fechaArriboEstimado: string | null;
  fechaEntrega: string | null;
  provinciaDestino: string | null;
  proximoPaso: string;
};

type Tab = "activas" | "entregadas";

function formatFecha(value: string | null): string {
  return value ? new Date(value).toLocaleDateString("es-AR", { timeZone: "UTC" }) : "—";
}

export default function UnidadesEnMovimientoGrid({
  activas,
  entregadas,
}: {
  activas: UnidadMovimiento[];
  entregadas: UnidadMovimiento[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("activas");
  const [query, setQuery] = useState("");
  const queryDebounced = useDebouncedValue(query, 300);

  const fuente = tab === "activas" ? activas : entregadas;

  const filtradas = useMemo(() => {
    const q = queryDebounced.trim().toLowerCase();
    if (!q) return fuente;
    return fuente.filter(
      (u) =>
        u.clienteNombre.toLowerCase().includes(q) ||
        (u.numeroUnidad ?? "").toLowerCase().includes(q) ||
        (u.envioNumeroPI ?? "").toLowerCase().includes(q)
    );
  }, [fuente, queryDebounced]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex gap-2" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={tab === "activas"}
            onClick={() => setTab("activas")}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
              tab === "activas" ? "bg-[#D4B06A] text-[#2F2F2F]" : "bg-stone-100 text-stone-500 hover:bg-stone-200"
            }`}
          >
            Activas ({activas.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "entregadas"}
            onClick={() => setTab("entregadas")}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
              tab === "entregadas" ? "bg-[#D4B06A] text-[#2F2F2F]" : "bg-stone-100 text-stone-500 hover:bg-stone-200"
            }`}
          >
            Entregadas ({entregadas.length})
          </button>
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por cliente, N° unidad o N° PI..."
          className="w-full sm:w-72 px-3 py-2 rounded-lg border border-[#E5E5E5] text-sm focus:outline-none focus:border-[#D4B06A]"
        />
      </div>

      {filtradas.length === 0 ? (
        <p className="text-sm text-stone-400">
          {fuente.length === 0
            ? tab === "activas"
              ? "No hay unidades en movimiento — todas entregadas."
              : "Todavía no hay unidades entregadas."
            : "Ningún resultado para la búsqueda."}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E5E5E5] text-left text-stone-500 text-xs uppercase tracking-wide">
                <th className="px-4 py-3 font-medium">N° Unidad</th>
                <th className="px-4 py-3 font-medium">Cliente</th>
                <th className="px-4 py-3 font-medium">Modelo</th>
                <th className="px-4 py-3 font-medium">PI/Envío</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium">Próximo paso</th>
                <th className="px-4 py-3 font-medium">Precio</th>
                <th className="px-4 py-3 font-medium">Embarque</th>
                <th className="px-4 py-3 font-medium">Arribo estimado</th>
                {tab === "entregadas" && <th className="px-4 py-3 font-medium">Entrega</th>}
                <th className="px-4 py-3 font-medium">Destino</th>
                <th className="px-4 py-3 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtradas.map((u) => (
                <tr
                  key={u.id}
                  onClick={() => router.push(`/admin/unidades/${u.id}`)}
                  className="border-b border-[#F0F0F0] last:border-0 hover:bg-stone-50 cursor-pointer"
                >
                  <td className="px-4 py-3 font-medium text-[#2F2F2F] whitespace-nowrap">
                    {u.numeroUnidad ?? "Sin número"}
                  </td>
                  <td className="px-4 py-3 text-stone-600">{u.clienteNombre}</td>
                  <td className="px-4 py-3 text-stone-600">{u.modelo ?? "—"}</td>
                  <td className="px-4 py-3 text-stone-600">{u.envioNumeroPI ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-bold ${estadoFabricacionColors[u.estadoFabricacion as EstadoFabricacion]}`}
                    >
                      {estadoFabricacionLabels[u.estadoFabricacion as EstadoFabricacion] ?? u.estadoFabricacion}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-stone-600">{u.proximoPaso}</td>
                  <td className="px-4 py-3">
                    {u.tienePrecio ? (
                      <span className="px-2 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">
                        Con precio
                      </span>
                    ) : (
                      <span className="px-2 py-1 rounded-full text-xs font-bold bg-stone-100 text-stone-500">
                        Sin precio
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-stone-600 whitespace-nowrap">{formatFecha(u.fechaEmbarque)}</td>
                  <td className="px-4 py-3 text-stone-600 whitespace-nowrap">{formatFecha(u.fechaArriboEstimado)}</td>
                  {tab === "entregadas" && (
                    <td className="px-4 py-3 text-stone-600 whitespace-nowrap">{formatFecha(u.fechaEntrega)}</td>
                  )}
                  <td className="px-4 py-3 text-stone-600">{u.provinciaDestino ?? "—"}</td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/unidades/${u.id}`}
                      onClick={(e) => e.stopPropagation()}
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
