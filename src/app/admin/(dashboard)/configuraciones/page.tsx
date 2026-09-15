import Link from "next/link";
import { db } from "@/lib/db";
import { modeloLabelsEs } from "@/lib/pdf/pedido-labels-es";
import { estadoPedidoLabels, type EstadoPedido } from "@/lib/pedido/estado-pedido";
import type { PedidoInput } from "@/lib/validators/pedido";

export const dynamic = "force-dynamic";

const ESTADO_CLASSES: Record<EstadoPedido, string> = {
  consulta: "bg-stone-100 text-stone-600",
  presupuestado: "bg-sage-100 text-sage-700",
  confirmado: "bg-emerald-100 text-emerald-700",
  en_produccion: "bg-amber-100 text-amber-700",
  en_transito: "bg-blue-100 text-blue-700",
  en_aduana: "bg-purple-100 text-purple-700",
  entregado: "bg-emerald-200 text-emerald-800",
};

async function getConfiguraciones() {
  return db.configuracionPedido.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      clienteNombre: true,
      clienteWhatsapp: true,
      modelo: true,
      numeroConsulta: true,
      estadoPedido: true,
      createdAt: true,
    },
  });
}

export default async function AdminConfiguracionesPage() {
  const configuraciones = await getConfiguraciones();

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      <div className="mb-8">
        <p className="text-sage-500 text-xs font-bold uppercase tracking-widest mb-1">
          Panel MOVARA
        </p>
        <h1 className="text-2xl font-bold text-[#2F2F2F]">Configuraciones de pedido</h1>
      </div>

      {configuraciones.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E5E5E5] p-10 text-center text-stone-500 text-sm">
          Todavía no llegó ninguna consulta desde el configurador.
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#E5E5E5] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E5E5E5] text-left text-stone-500 text-xs uppercase tracking-wide">
                <th className="px-5 py-3 font-medium">Código</th>
                <th className="px-5 py-3 font-medium">Nombre del cliente</th>
                <th className="px-5 py-3 font-medium">WhatsApp</th>
                <th className="px-5 py-3 font-medium">Modelo</th>
                <th className="px-5 py-3 font-medium">Fecha</th>
                <th className="px-5 py-3 font-medium">Estado</th>
                <th className="px-5 py-3 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {configuraciones.map((c) => (
                <tr key={c.id} className="border-b border-[#F0F0F0] last:border-0">
                  <td className="px-5 py-3 text-stone-500 font-mono text-xs">
                    {c.numeroConsulta ?? "—"}
                  </td>
                  <td className="px-5 py-3 font-medium text-[#2F2F2F]">{c.clienteNombre}</td>
                  <td className="px-5 py-3 text-stone-600">{c.clienteWhatsapp || "—"}</td>
                  <td className="px-5 py-3 text-stone-600">
                    {c.modelo ? modeloLabelsEs[c.modelo as PedidoInput["modelo"]] : "—"}
                  </td>
                  <td className="px-5 py-3 text-stone-500">
                    {c.createdAt.toLocaleDateString("es-AR")}
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-bold ${ESTADO_CLASSES[c.estadoPedido as EstadoPedido] ?? "bg-stone-100 text-stone-600"}`}
                    >
                      {estadoPedidoLabels[c.estadoPedido as EstadoPedido] ?? c.estadoPedido}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <Link
                      href={`/admin/configuraciones/${c.id}`}
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
