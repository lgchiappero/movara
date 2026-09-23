import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getSignedUrl, BUCKET_MOVARA } from "@/lib/admin/storage";
import { SECCIONES_ENVIO, estadoFabricacionLabels, type EstadoFabricacion } from "@/lib/envios/constantes";
import EnvioDetailForm from "@/components/admin/EnvioDetailForm";
import DocumentosPorSeccion, { type DocumentoSeccionConUrl } from "@/components/admin/DocumentosPorSeccion";

export const dynamic = "force-dynamic";

export default async function EnvioDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const envio = await db.envio.findUnique({
    where: { id },
    include: {
      unidades: { orderBy: { createdAt: "desc" }, include: { cliente: { select: { nombre: true } } } },
      documentos: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!envio) notFound();

  const documentosConUrl: DocumentoSeccionConUrl[] = await Promise.all(
    envio.documentos.map(async (d) => ({
      id: d.id,
      seccion: d.seccion,
      nombre: d.nombre,
      descripcion: d.descripcion,
      subidoPor: d.subidoPor,
      createdAt: d.createdAt.toISOString(),
      signedUrl: await getSignedUrl(BUCKET_MOVARA, d.url),
    }))
  );

  return (
    <div className="max-w-3xl mx-auto px-6 py-12 space-y-6">
      <Link href="/admin/envios" className="text-sm text-stone-500 hover:text-stone-700">
        ← Volver a la lista
      </Link>

      <div>
        <p className="text-sage-500 text-xs font-bold uppercase tracking-widest mb-1">
          Panel MOVARA
        </p>
        <h1 className="text-2xl font-bold text-[#2F2F2F]">
          {envio.numeroPI ? `Envío ${envio.numeroPI}` : "Envío sin PI cargado"}
        </h1>
      </div>

      <EnvioDetailForm
        id={id}
        initial={{
          numeroPI: envio.numeroPI,
          numeroBL: envio.numeroBL,
          numeroContenedor: envio.numeroContenedor,
          fechaEmbarque: envio.fechaEmbarque?.toISOString() ?? null,
          fechaArriboEstimado: envio.fechaArriboEstimado?.toISOString() ?? null,
          fechaArribo: envio.fechaArribo?.toISOString() ?? null,
          costoPI: envio.costoPI,
          costoFlete: envio.costoFlete,
          costoSeguro: envio.costoSeguro,
          costoAduana: envio.costoAduana,
          costoOtrosInternacional: envio.costoOtrosInternacional,
          notas: envio.notas,
        }}
      />

      <div className="bg-white rounded-2xl border border-[#E5E5E5] p-5">
        <h2 className="text-sm font-bold uppercase tracking-widest text-sage-600 mb-4">
          Unidades en este envío ({envio.unidades.length})
        </h2>
        {envio.unidades.length === 0 ? (
          <p className="text-sm text-stone-400">Todavía no hay unidades asignadas a este envío.</p>
        ) : (
          <div className="space-y-1.5">
            {envio.unidades.map((u) => (
              <Link
                key={u.id}
                href={`/admin/unidades/${u.id}`}
                className="flex items-center justify-between gap-3 text-sm py-2 px-3 rounded-lg border border-[#F0F0F0] hover:bg-stone-50 transition-colors"
              >
                <div>
                  <span className="font-medium text-[#2F2F2F]">{u.numeroUnidad ?? "Sin número"}</span>
                  <span className="text-stone-400 ml-2">{u.cliente.nombre}</span>
                  <span className="text-stone-400 ml-2">{u.modelo ?? "Modelo sin definir"}</span>
                </div>
                <span className="px-2 py-1 rounded-full text-xs font-bold bg-stone-100 text-stone-600">
                  {estadoFabricacionLabels[u.estadoFabricacion as EstadoFabricacion] ?? u.estadoFabricacion}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="text-sm font-bold uppercase tracking-widest text-sage-600 mb-4">
          Documentos del envío
        </h2>
        <DocumentosPorSeccion
          uploadUrl={`/api/admin/envios/${id}/documentos`}
          secciones={SECCIONES_ENVIO}
          documentos={documentosConUrl}
        />
      </div>
    </div>
  );
}
