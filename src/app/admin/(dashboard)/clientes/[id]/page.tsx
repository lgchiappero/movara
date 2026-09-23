import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { estadoFabricacionLabels, type EstadoFabricacion } from "@/lib/envios/constantes";
import ClienteDetailForm from "@/components/admin/ClienteDetailForm";

export const dynamic = "force-dynamic";

export default async function ClienteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const cliente = await db.cliente.findUnique({
    where: { id },
    include: {
      unidades: {
        orderBy: { createdAt: "desc" },
        include: { envio: { select: { numeroPI: true } } },
      },
    },
  });

  if (!cliente) notFound();

  return (
    <div className="max-w-3xl mx-auto px-6 py-12 space-y-6">
      <Link href="/admin/clientes" className="text-sm text-stone-500 hover:text-stone-700">
        ← Volver a la lista
      </Link>

      <div>
        <p className="text-sage-500 text-xs font-bold uppercase tracking-widest mb-1">
          Panel MOVARA
        </p>
        <h1 className="text-2xl font-bold text-[#2F2F2F]">{cliente.nombre}</h1>
      </div>

      <ClienteDetailForm
        id={id}
        initial={{
          nombre: cliente.nombre,
          dni: cliente.dni,
          cuit: cliente.cuit,
          domicilio: cliente.domicilio,
          email: cliente.email,
          telefono: cliente.telefono,
          notas: cliente.notas,
        }}
      />

      <div className="bg-white rounded-2xl border border-[#E5E5E5] p-5">
        <h2 className="text-sm font-bold uppercase tracking-widest text-sage-600 mb-4">
          Unidades ({cliente.unidades.length})
        </h2>
        {cliente.unidades.length === 0 ? (
          <p className="text-sm text-stone-400">Este cliente todavía no tiene unidades cargadas.</p>
        ) : (
          <div className="space-y-1.5">
            {cliente.unidades.map((u) => (
              <Link
                key={u.id}
                href={`/admin/unidades/${u.id}`}
                className="flex items-center justify-between gap-3 text-sm py-2 px-3 rounded-lg border border-[#F0F0F0] hover:bg-stone-50 transition-colors"
              >
                <div>
                  <span className="font-medium text-[#2F2F2F]">{u.numeroUnidad ?? "Sin número"}</span>
                  <span className="text-stone-400 ml-2">{u.modelo ?? "Modelo sin definir"}</span>
                  {u.envio?.numeroPI && <span className="text-stone-400 ml-2">· PI {u.envio.numeroPI}</span>}
                </div>
                <span className="px-2 py-1 rounded-full text-xs font-bold bg-stone-100 text-stone-600">
                  {estadoFabricacionLabels[u.estadoFabricacion as EstadoFabricacion] ?? u.estadoFabricacion}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
