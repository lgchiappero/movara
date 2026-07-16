import Link from "next/link";
import { db } from "@/lib/db";
import { modeloLabelsEs } from "@/lib/pdf/pedido-labels-es";
import type { PedidoInput } from "@/lib/validators/pedido";

export const dynamic = "force-dynamic";

const ESTADO_LABELS: Record<string, string> = {
  pendiente: "Pendiente",
  enviado: "Enviado",
  revisado: "Revisado",
  confirmado: "Confirmado",
};

const ESTADO_CLASSES: Record<string, string> = {
  pendiente: "bg-stone-100 text-stone-600",
  enviado: "bg-sage-100 text-sage-700",
  revisado: "bg-amber-100 text-amber-700",
  confirmado: "bg-emerald-100 text-emerald-700",
};

async function getConfiguraciones() {
  return db.configuracionPedido.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      clienteNombre: true,
      clienteWhatsapp: true,
      modelo: true,
      estado: true,
      createdAt: true,
    },
  });
}

export default async function AdminConfiguracionesPage() {
  const configuraciones = await getConfiguraciones();

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-sage-500 text-xs font-bold uppercase tracking-widest mb-1">
            Panel MOVARA
          </p>
          <h1 className="text-2xl font-bold text-[#2F2F2F]">Configuraciones de pedido</h1>
        </div>
        <Link
          href="/admin/configuraciones/nueva"
          className="px-5 py-3 bg-sage-500 hover:bg-sage-600 text-[#2F2F2F] font-bold text-sm rounded-xl transition-colors"
        >
          + Nueva configuración
        </Link>
      </div>

      {configuraciones.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E5E5E5] p-10 text-center text-stone-500 text-sm">
          Todavía no hay configuraciones creadas.
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#E5E5E5] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E5E5E5] text-left text-stone-500 text-xs uppercase tracking-wide">
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
                      className={`px-2 py-1 rounded-full text-xs font-bold ${ESTADO_CLASSES[c.estado] ?? "bg-stone-100 text-stone-600"}`}
                    >
                      {ESTADO_LABELS[c.estado] ?? c.estado}
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
