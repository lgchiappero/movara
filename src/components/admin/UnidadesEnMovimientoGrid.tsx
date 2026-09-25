"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { estadoFabricacionLabels, estadoFabricacionColors, type EstadoFabricacion } from "@/lib/envios/constantes";

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
  provinciaDestino: string | null;
};

function formatFecha(value: string | null): string {
  return value ? new Date(value).toLocaleDateString("es-AR", { timeZone: "UTC" }) : "—";
}

export default function UnidadesEnMovimientoGrid({ unidades }: { unidades: UnidadMovimiento[] }) {
  const router = useRouter();

  if (unidades.length === 0) {
    return <p className="text-sm text-stone-400">No hay unidades en movimiento — todas entregadas.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[#E5E5E5] text-left text-stone-500 text-xs uppercase tracking-wide">
            <th className="px-4 py-3 font-medium">N° Unidad</th>
            <th className="px-4 py-3 font-medium">Cliente</th>
            <th className="px-4 py-3 font-medium">Modelo</th>
            <th className="px-4 py-3 font-medium">PI/Envío</th>
            <th className="px-4 py-3 font-medium">Estado</th>
            <th className="px-4 py-3 font-medium">Precio</th>
            <th className="px-4 py-3 font-medium">Embarque</th>
            <th className="px-4 py-3 font-medium">Arribo estimado</th>
            <th className="px-4 py-3 font-medium">Destino</th>
            <th className="px-4 py-3 font-medium">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {unidades.map((u) => (
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
  );
}
