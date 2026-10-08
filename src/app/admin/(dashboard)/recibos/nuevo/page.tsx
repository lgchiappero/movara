import Link from "next/link";
import { db } from "@/lib/db";
import NuevoReciboForm, { type UnidadParaRecibo } from "@/components/admin/recibos/NuevoReciboForm";
import { lugarPorDefecto } from "@/lib/recibos/servicio";

export const dynamic = "force-dynamic";

export default async function NuevoReciboPage({ searchParams }: { searchParams: Promise<{ unidad?: string }> }) {
  const { unidad } = await searchParams;
  const unidades = await db.unidad.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      cliente: { select: { nombre: true, dni: true, cuit: true, email: true, telefono: true } },
      recibos: { where: { estado: { not: "anulado" } }, select: { numeroRecibo: true } },
    },
  });

  const opciones: UnidadParaRecibo[] = unidades.map((u) => ({
    id: u.id,
    numeroUnidad: u.numeroUnidad,
    modelo: u.modelo,
    lugarPorDefecto: lugarPorDefecto(u),
    reciboVigente: u.recibos[0]?.numeroRecibo ?? null,
    cliente: u.cliente,
  }));

  return (
    <div className="max-w-3xl mx-auto px-6 py-12 space-y-6">
      <Link href="/admin/recibos" className="text-sm text-stone-500 hover:text-stone-700">
        ← Volver a Recibos
      </Link>
      <div>
        <p className="text-sage-500 text-xs font-bold uppercase tracking-widest mb-1">Panel MOVARA</p>
        <h1 className="text-2xl font-bold text-[#2F2F2F]">Nuevo Recibo en Conformidad</h1>
      </div>
      <NuevoReciboForm unidades={opciones} unidadInicial={unidad} />
    </div>
  );
}
