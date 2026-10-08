import Link from "next/link";
import { db } from "@/lib/db";
import RecibosGrid from "@/components/admin/recibos/RecibosGrid";
import { esEstadoRecibo } from "@/lib/recibos/constantes";
import type { FilaRecibo } from "@/lib/recibos/filtros";

export const dynamic = "force-dynamic";

export default async function AdminRecibosPage() {
  const recibos = await db.reciboConformidad.findMany({
    orderBy: { createdAt: "desc" },
    include: { unidad: { select: { clienteId: true } } },
  });

  const filas: FilaRecibo[] = recibos.map((r) => ({
    id: r.id,
    numeroRecibo: r.numeroRecibo,
    estado: esEstadoRecibo(r.estado) ? r.estado : "pendiente",
    clienteId: r.unidad.clienteId,
    clienteNombre: r.clienteNombre,
    unidadId: r.unidadId,
    numeroUnidad: r.numeroUnidad,
    modelo: r.modelo,
    fechaEntrega: r.fechaEntrega.toISOString(),
    confirmadoAt: r.confirmadoAt?.toISOString() ?? null,
  }));

  return (
    <div className="max-w-6xl mx-auto px-6 py-12 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sage-500 text-xs font-bold uppercase tracking-widest mb-1">Panel MOVARA</p>
          <h1 className="text-2xl font-bold text-[#2F2F2F]">Recibos en Conformidad</h1>
          <p className="text-sm text-stone-500 mt-1">
            Constancia de que el cliente recibió la unidad en conformidad. El cliente la confirma desde el link que recibe por email.
          </p>
        </div>
        <Link
          href="/admin/recibos/nuevo"
          className="shrink-0 px-3 py-1.5 bg-[#D4B06A] hover:bg-[#c19f57] text-[#2F2F2F] font-bold text-sm rounded-lg transition-colors"
        >
          Nuevo recibo
        </Link>
      </div>
      <RecibosGrid filas={filas} ahora={new Date().toISOString()} />
    </div>
  );
}
