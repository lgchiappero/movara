import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getSignedUrl, BUCKET_MOVARA } from "@/lib/admin/storage";
import { SECCIONES_UNIDAD, SECCIONES_ENVIO } from "@/lib/envios/constantes";
import UnidadDetailForm from "@/components/admin/UnidadDetailForm";
import DocumentosPorSeccion, { type DocumentoSeccionConUrl } from "@/components/admin/DocumentosPorSeccion";
import CobranzaUnidadSection from "@/components/admin/CobranzaUnidadSection";
import UnidadTimeline from "@/components/admin/UnidadTimeline";
import { serializeAcuerdo } from "@/lib/cobranza/serialize";
import { calcularPasos, accionesPasoActual, type DatosTimelineUnidad } from "@/lib/envios/timeline";

export const dynamic = "force-dynamic";

export default async function UnidadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const unidad = await db.unidad.findUnique({
    where: { id },
    include: {
      cliente: { select: { id: true, nombre: true } },
      envio: {
        select: { id: true, numeroPI: true, fechaEmbarque: true, documentos: { orderBy: { createdAt: "desc" } } },
      },
      documentos: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!unidad) notFound();

  const [clientes, envios, documentosUnidadConUrl, documentosEnvioConUrl, acuerdosRaw] = await Promise.all([
    db.cliente.findMany({ orderBy: { nombre: "asc" }, select: { id: true, nombre: true } }),
    db.envio.findMany({
      orderBy: { createdAt: "desc" },
      select: { id: true, numeroPI: true, numeroContenedor: true, fechaArriboEstimado: true },
    }),
    Promise.all(
      unidad.documentos.map(async (d): Promise<DocumentoSeccionConUrl> => ({
        id: d.id,
        seccion: d.seccion,
        nombre: d.nombre,
        descripcion: d.descripcion,
        subidoPor: d.subidoPor,
        createdAt: d.createdAt.toISOString(),
        signedUrl: await getSignedUrl(BUCKET_MOVARA, d.url),
      }))
    ),
    unidad.envio
      ? Promise.all(
          unidad.envio.documentos.map(async (d): Promise<DocumentoSeccionConUrl> => ({
            id: d.id,
            seccion: d.seccion,
            nombre: d.nombre,
            descripcion: d.descripcion,
            subidoPor: d.subidoPor,
            createdAt: d.createdAt.toISOString(),
            signedUrl: await getSignedUrl(BUCKET_MOVARA, d.url),
          }))
        )
      : Promise.resolve([]),
    db.acuerdoPago.findMany({
      where: { unidadId: id },
      include: {
        unidad: {
          select: {
            numeroUnidad: true,
            modelo: true,
            estadoFabricacion: true,
            cliente: { select: { id: true, nombre: true } },
          },
        },
        cuotas: { orderBy: { vencimiento: "asc" } },
        movimientos: { orderBy: { fecha: "desc" } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const acuerdos = acuerdosRaw.map(serializeAcuerdo);

  // Primer cobro registrado para esta unidad — cualquiera de sus acuerdos
  // de tipo "cobro", el movimiento más antiguo entre todos ellos.
  const fechasCobro = acuerdos
    .filter((a) => a.tipo === "cobro")
    .flatMap((a) => a.movimientos.map((m) => new Date(m.fecha)))
    .sort((a, b) => a.getTime() - b.getTime());

  const datosTimeline: DatosTimelineUnidad = {
    clienteId: unidad.clienteId,
    modelo: unidad.modelo,
    precioCliente: unidad.precioCliente,
    estadoFabricacion: unidad.estadoFabricacion,
    createdAt: unidad.createdAt,
    fechaEntrega: unidad.fechaEntrega,
    fechaEmbarque: unidad.envio?.fechaEmbarque ?? null,
    primerCobroFecha: fechasCobro[0] ?? null,
  };
  const pasosTimeline = calcularPasos(datosTimeline);
  const accionActual = accionesPasoActual(datosTimeline);

  return (
    <div className="max-w-3xl mx-auto px-6 py-12 space-y-6">
      <Link href="/admin/unidades" className="text-sm text-stone-500 hover:text-stone-700">
        ← Volver a la lista
      </Link>

      <div className="flex items-center justify-between">
        <div>
          <p className="text-sage-500 text-xs font-bold uppercase tracking-widest mb-1">
            Panel MOVARA
          </p>
          <h1 className="text-2xl font-bold text-[#2F2F2F]">{unidad.numeroUnidad ?? "Unidad sin número"}</h1>
          <Link
            href={`/admin/clientes/${unidad.cliente.id}`}
            className="text-sm text-sage-600 hover:text-sage-700 font-medium"
          >
            {unidad.cliente.nombre}
          </Link>
        </div>
      </div>

      <UnidadTimeline pasos={pasosTimeline} actual={accionActual} envioId={unidad.envioId} />

      <UnidadDetailForm
        id={id}
        clientes={clientes}
        envios={envios.map((e) => ({
          id: e.id,
          numeroPI: e.numeroPI,
          numeroContenedor: e.numeroContenedor,
          fechaArriboEstimado: e.fechaArriboEstimado?.toISOString() ?? null,
        }))}
        initial={{
          clienteId: unidad.clienteId,
          envioId: unidad.envioId,
          modelo: unidad.modelo,
          configuracion: unidad.configuracion as Record<string, unknown> | null,
          precioCliente: unidad.precioCliente,
          estadoFabricacion: unidad.estadoFabricacion,
          provinciaDestino: unidad.provinciaDestino,
          localidadDestino: unidad.localidadDestino,
          direccionEntrega: unidad.direccionEntrega,
          costoTransporteNacional: unidad.costoTransporteNacional,
          costoGrua: unidad.costoGrua,
          fechaEntregaEstimada: unidad.fechaEntregaEstimada?.toISOString() ?? null,
          fechaEntrega: unidad.fechaEntrega?.toISOString() ?? null,
          garantiaActivada: unidad.garantiaActivada,
          garantiaInicio: unidad.garantiaInicio?.toISOString() ?? null,
          garantiaFin: unidad.garantiaFin?.toISOString() ?? null,
          notas: unidad.notas,
        }}
      />

      <div>
        <h2 className="text-sm font-bold uppercase tracking-widest text-sage-600 mb-4">
          Documentos de la unidad
        </h2>
        <DocumentosPorSeccion
          uploadUrl={`/api/admin/unidades/${id}/documentos`}
          secciones={SECCIONES_UNIDAD}
          documentos={documentosUnidadConUrl}
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold uppercase tracking-widest text-sage-600">
            Documentos del envío (04, 05, 06)
          </h2>
          {unidad.envio && (
            <Link
              href={`/admin/envios/${unidad.envio.id}`}
              className="text-xs text-sage-600 hover:text-sage-700 font-medium"
            >
              Ir al envío {unidad.envio.numeroPI ?? ""} →
            </Link>
          )}
        </div>
        {!unidad.envio ? (
          <div className="bg-white rounded-2xl border border-[#E5E5E5] p-5 text-sm text-stone-400">
            Esta unidad todavía no está asignada a ningún envío — esos documentos se cargan desde el
            detalle del envío una vez asignada.
          </div>
        ) : documentosEnvioConUrl.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#E5E5E5] p-5 text-sm text-stone-400">
            El envío todavía no tiene documentos en estas secciones. Se suben desde el detalle del envío.
          </div>
        ) : (
          <div className="space-y-3">
            {SECCIONES_ENVIO.map((s) => {
              const docs = documentosEnvioConUrl.filter((d) => d.seccion === s.key);
              if (docs.length === 0) return null;
              return (
                <div key={s.key} className="bg-white rounded-2xl border border-[#E5E5E5] p-5">
                  <h3 className="text-sm font-bold text-[#2F2F2F] mb-2">{s.titulo}</h3>
                  <div className="space-y-1.5">
                    {docs.map((d) => (
                      <div key={d.id} className="flex items-center justify-between text-sm">
                        <span className="text-[#2F2F2F]">{d.nombre}</span>
                        {d.signedUrl ? (
                          <a
                            href={d.signedUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sage-600 font-medium text-xs hover:underline"
                          >
                            Ver
                          </a>
                        ) : (
                          <span className="text-stone-300 text-xs">No disponible</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <CobranzaUnidadSection
        unidad={{ id, numeroUnidad: unidad.numeroUnidad, clienteNombre: unidad.cliente.nombre }}
        acuerdos={acuerdos}
      />
    </div>
  );
}
