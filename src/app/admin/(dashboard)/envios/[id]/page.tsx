import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getSignedUrl, BUCKET_MOVARA } from "@/lib/admin/storage";
import { SECCIONES_ENVIO } from "@/lib/envios/constantes";
import EnvioDetailForm from "@/components/admin/EnvioDetailForm";
import DocumentosPorSeccion, { type DocumentoSeccionConUrl } from "@/components/admin/DocumentosPorSeccion";
import AgregarUnidadSelector from "@/components/admin/AgregarUnidadSelector";
import UnidadEnvioRow from "@/components/admin/UnidadEnvioRow";

export const dynamic = "force-dynamic";

export default async function EnvioDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [envio, unidadesDisponibles] = await Promise.all([
    db.envio.findUnique({
      where: { id },
      include: {
        unidades: { orderBy: { createdAt: "desc" }, include: { cliente: { select: { nombre: true } } } },
        documentos: { orderBy: { createdAt: "desc" } },
      },
    }),
    db.unidad.findMany({
      where: { envioId: null },
      select: { id: true, numeroUnidad: true, cliente: { select: { nombre: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

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

      <div className="bg-white rounded-2xl border border-[#E5E5E5] p-5 space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-widest text-sage-600">
          Unidades en este envío ({envio.unidades.length})
        </h2>

        <AgregarUnidadSelector
          envioId={id}
          unidadesDisponibles={unidadesDisponibles.map((u) => ({
            id: u.id,
            numeroUnidad: u.numeroUnidad,
            clienteNombre: u.cliente.nombre,
          }))}
        />

        {envio.unidades.length === 0 ? (
          <p className="text-sm text-stone-400">Todavía no hay unidades asignadas a este envío.</p>
        ) : (
          <div className="space-y-1.5">
            {envio.unidades.map((u) => (
              <UnidadEnvioRow
                key={u.id}
                unidad={{
                  id: u.id,
                  numeroUnidad: u.numeroUnidad,
                  clienteNombre: u.cliente.nombre,
                  modelo: u.modelo,
                  estadoFabricacion: u.estadoFabricacion,
                }}
              />
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
