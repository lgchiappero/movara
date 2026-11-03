import Link from "next/link";
import LinkSeguimiento from "@/components/admin/LinkSeguimiento";
import { linkSeguimiento } from "@/lib/email/pedido-estado-email";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { buildPedidoNarrativeEs } from "@/lib/pdf/pedido-narrative-es";
import type { PedidoRecord } from "@/lib/pdf/pedido-record";
import {
  MATERIAL_CATEGORY_GROUPS,
  findMaterialOption,
  getStoredMaterialLabel,
  getMaterialesAnteriores,
  esSelectorAConsultar,
} from "@/data/material-catalog";
import { etiquetaEstadoPedido, ESTADO_PEDIDO_CANCELADO } from "@/lib/pedido/estado-pedido";
import CancelarPedidoSection from "@/components/admin/CancelarPedidoSection";
import { getSignedUrl, BUCKET_PEDIDOS } from "@/lib/admin/storage";
import GestionPedidoPanel from "@/components/admin/GestionPedidoPanel";
import DocumentosPedidoSection, { type DocumentoConUrl } from "@/components/admin/DocumentosPedidoSection";
import ConfiguracionEspacioForm from "@/components/admin/ConfiguracionEspacioForm";
import { MaterialImage } from "@/components/configurador/MaterialImage";
import EliminarConfiguracionButton from "@/components/admin/EliminarConfiguracionButton";
import { getAdminUser } from "@/lib/admin/current-user";
import { isAdmin } from "@/lib/admin/roles";
import { buscarPedidoTolerante } from "@/lib/admin/pedido-tolerante";
import SeccionSegura from "@/components/admin/SeccionSegura";
import { seccionSegura } from "@/components/admin/DatoNoDisponible";

export const dynamic = "force-dynamic";

/** Link firmado del documento; si Storage falla, el documento queda sin
 *  link pero el pedido se ve igual. */
async function resolveUrl(path: string | null): Promise<string | null> {
  if (!path) return null;
  try {
    return await getSignedUrl(BUCKET_PEDIDOS, path);
  } catch (err) {
    console.error(`[admin] No se pudo firmar ${path}:`, err);
    return null;
  }
}

/** Lo que se guardó en `materiales`, solo si tiene la forma esperada. */
function materialesDe(raw: unknown): Record<string, string | null> | null {
  return raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, string | null>) : null;
}

export default async function ConfiguracionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // Nunca rompe entero por una columna que falte en la base: esos campos
  // vienen vacíos y se avisa arriba.
  const resultado = await buscarPedidoTolerante(id);
  if (!resultado) notFound();
  const { pedido: config, camposNoDisponibles } = resultado;
  const materiales = materialesDe(config.materiales);

  const session = await getAdminUser();

  const [vendedores, documentos] = await Promise.all([
    db.adminUser.findMany({
      where: { rol: "vendedor", activo: true },
      select: { email: true, nombre: true },
      orderBy: { nombre: "asc" },
    }),
    db.documentoPedido.findMany({ where: { pedidoId: id }, orderBy: { createdAt: "desc" } }).catch((err) => {
      console.error(`[admin] No se pudieron leer los documentos del pedido ${id}:`, err);
      return [];
    }),
  ]);

  const [piUrl, comprobantePagoUrl, comprobanteSaldoUrl, seguroUrl, inspeccionUrl, fotosUrl, documentosConUrl] =
    await Promise.all([
      resolveUrl(config.piUrl),
      resolveUrl(config.comprobantePagoUrl),
      resolveUrl(config.comprobanteSaldoUrl),
      resolveUrl(config.seguroUrl),
      resolveUrl(config.inspeccionUrl),
      resolveUrl(config.fotosUrl),
      Promise.all(
        documentos.map(async (d): Promise<DocumentoConUrl> => ({
          id: d.id,
          tipo: d.tipo,
          nombre: d.nombre,
          notas: d.notas,
          subidoPor: d.subidoPor,
          createdAt: d.createdAt.toISOString(),
          signedUrl: await resolveUrl(d.url),
        }))
      ),
    ]);

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <Link href="/admin/configuraciones" className="text-sm text-stone-500 hover:text-stone-700">
        ← Volver a la lista
      </Link>

      <div className="flex items-center justify-between mt-4 mb-8">
        <div>
          <p className="text-sage-500 text-xs font-bold uppercase tracking-widest mb-1">
            {etiquetaEstadoPedido(config.estadoPedido)}
          </p>
          <h1 className="text-2xl font-bold text-[#2F2F2F]">{config.clienteNombre}</h1>
        </div>
        <div className="flex items-center gap-3">
          <a
            href={`/api/admin/configuraciones/${id}/pdf`}
            className="px-5 py-3 bg-sage-500 hover:bg-sage-600 text-[#2F2F2F] font-bold text-sm rounded-xl transition-colors"
          >
            Descargar PDF
          </a>
          {session && isAdmin(session.rol) && <EliminarConfiguracionButton id={id} />}
        </div>
      </div>

      {camposNoDisponibles.length > 0 && (
        <div role="alert" className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6 text-sm text-amber-900">
          Hay datos de este pedido que no se pudieron leer ({camposNoDisponibles.join(", ")}): figuran como dato no
          disponible. El resto del pedido está completo.
        </div>
      )}

      <div className="bg-white rounded-2xl border border-[#E5E5E5] p-5 mb-6 space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-stone-500">WhatsApp</span>
          <span className="text-[#2F2F2F] font-medium">{config.clienteWhatsapp || "—"}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-stone-500">Email</span>
          <span className="text-[#2F2F2F] font-medium">{config.clienteEmail || "—"}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-stone-500">Cliente</span>
          {config.clienteId ? (
            <Link href={`/admin/clientes/${config.clienteId}`} className="text-sage-600 font-bold hover:underline">
              Ver ficha del cliente →
            </Link>
          ) : (
            <span className="text-[#2F2F2F] font-medium">—</span>
          )}
        </div>
        <div className="flex justify-between">
          <span className="text-stone-500">Número de consulta</span>
          <span className="text-[#2F2F2F] font-medium">{config.numeroConsulta || "—"}</span>
        </div>
        {/* Único acceso del cliente a /mi-pedido — mandárselo por WhatsApp. */}
        <div className="flex justify-between items-center gap-4">
          <span className="text-stone-500 shrink-0">Link de seguimiento</span>
          <LinkSeguimiento url={linkSeguimiento(config.tokenSeguimiento)} />
        </div>
        <div className="flex justify-between">
          <span className="text-stone-500">Creado</span>
          <span className="text-[#2F2F2F] font-medium">
            {config.createdAt.toLocaleDateString("es-AR")}
          </span>
        </div>
      </div>

      <div className="mb-6">
        <SeccionSegura titulo="Configuración del espacio">
          <ConfiguracionEspacioForm
            id={id}
            initial={{
              modelo: config.modelo,
              finalidad: config.finalidad,
              provincia: config.provincia,
              localidad: config.localidad,
              habitaciones: config.habitaciones,
              incluyeCocina: config.incluyeCocina,
              tipoCocina: config.tipoCocina,
              incluyeBano: config.incluyeBano,
              tipoAgua: config.tipoAgua,
              lavarropas: config.lavarropas,
              materiales,
              upgrades: config.upgrades ?? [],
              notasConfiguracion: config.notasConfiguracion,
            }}
          />
        </SeccionSegura>
      </div>

      <div className="bg-white rounded-2xl border border-[#E5E5E5] p-5 mb-6">
        <h2 className="text-sm font-bold uppercase tracking-widest text-sage-600 mb-4">
          Configuración completa
        </h2>
        {/* Se llaman como funciones para que seccionSegura atrape un error al armarlas. */}
        {seccionSegura("Configuración completa", () => NarrativeView({ data: { ...config, upgrades: config.upgrades ?? [], materiales } }))}
      </div>

      <div className="bg-white rounded-2xl border border-[#E5E5E5] p-5 mb-6">
        <h2 className="text-sm font-bold uppercase tracking-widest text-sage-600 mb-4">
          Materiales elegidos
        </h2>
        {seccionSegura("Materiales elegidos", () => MaterialesConImagenes({ materiales: materiales ?? {} }))}
      </div>

      <div className="space-y-6">
        <SeccionSegura titulo="Cancelación">
          <CancelarPedidoSection
            id={id}
            cancelado={config.estadoPedido === ESTADO_PEDIDO_CANCELADO}
            motivoCancelacion={config.motivoCancelacion}
            fechaCancelacion={config.fechaCancelacion?.toISOString() ?? null}
            canceladoPor={config.canceladoPor}
            estadoAntesDeCancelar={config.estadoAntesDeCancelar}
          />
        </SeccionSegura>
        {/* key: al cancelar o reactivar se vuelve a montar con el estado nuevo
            (si no, el formulario guardaría el estado viejo y lo reactivaría). */}
        <SeccionSegura titulo="Gestión del pedido">
          <GestionPedidoPanel
            key={config.estadoPedido}
            id={id}
            numeroPedido={config.numeroPedido}
            initial={{
              estadoPedido: config.estadoPedido,
              precioFinal: config.precioFinal,
              anticipo: config.anticipo,
              numeroFabrica: config.numeroFabrica,
              numeroContenedor: config.numeroContenedor,
              numeroBL: config.numeroBL,
              fechaConfirmacion: config.fechaConfirmacion?.toISOString() ?? null,
              fechaProduccion: config.fechaProduccion?.toISOString() ?? null,
              fechaDespacho: config.fechaDespacho?.toISOString() ?? null,
              fechaArriboEstimado: config.fechaArriboEstimado?.toISOString() ?? null,
              fechaEntrega: config.fechaEntrega?.toISOString() ?? null,
              notasInternas: config.notasInternas,
              notasCliente: config.notasCliente,
              costoProveedor: config.costoProveedor,
              costoFlete: config.costoFlete,
              costoAduana: config.costoAduana,
              costoOtros: config.costoOtros,

              vendedorAsignado: config.vendedorAsignado,
              piProveedor: config.piProveedor,
              fechaPIPagado: config.fechaPIPagado?.toISOString() ?? null,
              montoPI: config.montoPI,

              seguroTransporte: config.seguroTransporte,
              inspeccionFabrica: config.inspeccionFabrica,
              fotosDespachadas: config.fotosDespachadas,
              notasDespachador: config.notasDespachador,
              gastosDespachante: config.gastosDespachante,
              impuestosAduana: config.impuestosAduana,
              gastosPortuarios: config.gastosPortuarios,

              costoGruaDescarga: config.costoGruaDescarga,
              costoTransporteLocal: config.costoTransporteLocal,
              instalacionFecha: config.instalacionFecha?.toISOString() ?? null,
              instalacionNotas: config.instalacionNotas,
              satisfaccionCliente: config.satisfaccionCliente,

              garantiaActivada: config.garantiaActivada,
              garantiaFechaInicio: config.garantiaFechaInicio?.toISOString() ?? null,
              garantiaFechaFin: config.garantiaFechaFin?.toISOString() ?? null,
            }}
            documentUrls={{ piUrl, comprobantePagoUrl, comprobanteSaldoUrl, seguroUrl, inspeccionUrl, fotosUrl }}
            vendedores={vendedores}
          />
        </SeccionSegura>

        <SeccionSegura titulo="Documentos">
          <DocumentosPedidoSection pedidoId={id} documentos={documentosConUrl} puedeEliminar={!!session && isAdmin(session.rol)} />
        </SeccionSegura>
      </div>
    </div>
  );
}

function NarrativeView({ data }: { data: PedidoRecord }) {
  const items = buildPedidoNarrativeEs(data);
  return (
    <div className="space-y-3 text-sm">
      {items.map((item, i) =>
        item.type === "line" ? (
          <p key={i}>
            <span className="font-medium text-[#2F2F2F]">{item.label}: </span>
            <span className="text-stone-600">{item.value}</span>
          </p>
        ) : (
          <div key={i}>
            <p className="text-sage-600 font-bold text-xs uppercase tracking-wide mb-1">
              {item.title}
            </p>
            <ul className="list-disc list-inside text-stone-600 space-y-0.5">
              {item.bullets.map((b, j) => (
                <li key={j}>{b}</li>
              ))}
            </ul>
          </div>
        )
      )}
    </div>
  );
}

function MaterialesConImagenes({ materiales }: { materiales: Record<string, string | null> }) {
  const anteriores = getMaterialesAnteriores(materiales);
  return (
    <div className="space-y-6">
      {MATERIAL_CATEGORY_GROUPS.map((group) => {
        const seenKeys = new Set<string>();
        const cards = group.selectors.flatMap((selector) => {
          if (seenKeys.has(selector.key)) return [];
          seenKeys.add(selector.key);
          const raw = materiales[selector.key] ?? null;
          const found = findMaterialOption(selector.key, raw);
          const aCotizar = esSelectorAConsultar(selector.key, materiales);
          if (found) {
            const label = found.option.extraNombre ? `${found.option.label} — ${found.option.extraNombre}` : found.option.label;
            return [{ key: selector.key, img: found.option.img, label, imageFit: found.selector.imageFit, aCotizar }];
          }
          // Opción retirada del catálogo o texto libre del admin: sin foto,
          // pero se muestra igual para que el pedido no pierda el dato.
          const label = getStoredMaterialLabel(selector.key, raw);
          if (label) return [{ key: selector.key, img: undefined, label, imageFit: undefined, aCotizar }];
          // Selector agregado después del pedido (ej. amoblamiento del baño).
          if (selector.sinDato) {
            return [{ key: selector.key, img: undefined, label: `${selector.label.split(" — ")[0]}: ${selector.sinDato}`, imageFit: undefined, aCotizar }];
          }
          return [];
        });

        if (cards.length === 0) return null;

        return (
          <div key={group.key}>
            <p className="text-xs font-bold uppercase tracking-widest text-stone-400 mb-2">
              {group.title}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {cards.map((card) => (
                <div key={card.key} className="rounded-xl border border-[#E5E5E5] overflow-hidden">
                  {card.img && (
                    <div className="relative w-full aspect-square bg-stone-50">
                      <MaterialImage src={card.img} alt={card.label} sizes="(min-width: 640px) 33vw, 50vw" fit={card.imageFit} />
                    </div>
                  )}
                  <p className="text-xs text-stone-600 px-2 py-1.5 truncate" title={card.label}>{card.label}</p>
                  {card.aCotizar && (
                    <p className="mx-2 mb-2 inline-block px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-[#faeeda] text-[#854F0B]">
                      A consultar
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
      {anteriores.length > 0 && (
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-stone-400 mb-2">Configuración anterior</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {anteriores.map((m) => (
              <div key={m.key} className="rounded-xl border border-[#E5E5E5] px-2 py-1.5">
                <p className="text-xs text-stone-600" title={m.label}>{m.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
