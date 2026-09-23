import Link from "next/link";
import { db } from "@/lib/db";
import { estadoFabricacionLabels, estadoFabricacionIndex, type EstadoFabricacion } from "@/lib/envios/constantes";
import NuevoEnvioButton from "@/components/admin/NuevoEnvioButton";

export const dynamic = "force-dynamic";

async function getEnvios() {
  return db.envio.findMany({
    orderBy: { createdAt: "desc" },
    include: { unidades: { include: { cliente: { select: { nombre: true } } } } },
  });
}

/** El envío está tan avanzado como su unidad menos avanzada. */
function estadoGeneral(unidades: { estadoFabricacion: string }[]): EstadoFabricacion | null {
  if (unidades.length === 0) return null;
  return unidades.reduce((min, u) => {
    return estadoFabricacionIndex(u.estadoFabricacion) < estadoFabricacionIndex(min)
      ? u.estadoFabricacion
      : min;
  }, unidades[0].estadoFabricacion) as EstadoFabricacion;
}

export default async function AdminEnviosPage() {
  const envios = await getEnvios();

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <p className="text-sage-500 text-xs font-bold uppercase tracking-widest mb-1">
            Panel MOVARA
          </p>
          <h1 className="text-2xl font-bold text-[#2F2F2F]">Envíos</h1>
        </div>
        <NuevoEnvioButton />
      </div>

      {envios.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E5E5E5] p-10 text-center text-stone-500 text-sm">
          Todavía no hay envíos cargados.
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#E5E5E5] overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E5E5E5] text-left text-stone-500 text-xs uppercase tracking-wide">
                <th className="px-4 py-3 font-medium">N° PI</th>
                <th className="px-4 py-3 font-medium">N° Contenedor</th>
                <th className="px-4 py-3 font-medium">Arribo estimado</th>
                <th className="px-4 py-3 font-medium">Unidades</th>
                <th className="px-4 py-3 font-medium">Clientes</th>
                <th className="px-4 py-3 font-medium">Estado general</th>
                <th className="px-4 py-3 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {envios.map((e) => {
                const estado = estadoGeneral(e.unidades);
                const clientes = Array.from(new Set(e.unidades.map((u) => u.cliente.nombre)));
                return (
                  <tr key={e.id} className="border-b border-[#F0F0F0] last:border-0">
                    <td className="px-4 py-3 font-medium text-[#2F2F2F]">{e.numeroPI || "—"}</td>
                    <td className="px-4 py-3 text-stone-600">{e.numeroContenedor || "—"}</td>
                    <td className="px-4 py-3 text-stone-600">
                      {e.fechaArriboEstimado
                        ? e.fechaArriboEstimado.toLocaleDateString("es-AR", { timeZone: "UTC" })
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-stone-600">{e.unidades.length}</td>
                    <td className="px-4 py-3 text-stone-600 max-w-[220px] truncate" title={clientes.join(", ")}>
                      {clientes.length > 0 ? clientes.join(", ") : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {estado ? (
                        <span className="px-2 py-1 rounded-full text-xs font-bold bg-stone-100 text-stone-600">
                          {estadoFabricacionLabels[estado]}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/envios/${e.id}`}
                        className="text-sage-600 hover:text-sage-700 font-medium"
                      >
                        Ver detalle
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
