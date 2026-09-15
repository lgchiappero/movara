import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { buildPedidoNarrativeEs } from "@/lib/pdf/pedido-narrative-es";
import type { PedidoInput } from "@/lib/validators/pedido";
import { MATERIAL_CATEGORY_GROUPS, findMaterialOption } from "@/data/material-catalog";
import { estadoPedidoLabels, type EstadoPedido } from "@/lib/pedido/estado-pedido";
import GestionPedidoPanel from "@/components/admin/GestionPedidoPanel";

export const dynamic = "force-dynamic";

export default async function ConfiguracionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const config = await db.configuracionPedido.findUnique({ where: { id } });

  if (!config) notFound();

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <Link href="/admin/configuraciones" className="text-sm text-stone-500 hover:text-stone-700">
        ← Volver a la lista
      </Link>

      <div className="flex items-center justify-between mt-4 mb-8">
        <div>
          <p className="text-sage-500 text-xs font-bold uppercase tracking-widest mb-1">
            {estadoPedidoLabels[config.estadoPedido as EstadoPedido] ?? config.estadoPedido}
          </p>
          <h1 className="text-2xl font-bold text-[#2F2F2F]">{config.clienteNombre}</h1>
        </div>
        <a
          href={`/api/admin/configuraciones/${id}/pdf`}
          className="px-5 py-3 bg-sage-500 hover:bg-sage-600 text-[#2F2F2F] font-bold text-sm rounded-xl transition-colors"
        >
          Descargar PDF
        </a>
      </div>

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
          <span className="text-stone-500">Número de consulta</span>
          <span className="text-[#2F2F2F] font-medium">{config.numeroConsulta || "—"}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-stone-500">Creado</span>
          <span className="text-[#2F2F2F] font-medium">
            {config.createdAt.toLocaleDateString("es-AR")}
          </span>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-[#E5E5E5] p-5 mb-6">
        <h2 className="text-sm font-bold uppercase tracking-widest text-sage-600 mb-4">
          Configuración completa
        </h2>
        <NarrativeView data={config as unknown as PedidoInput} />
      </div>

      <div className="bg-white rounded-2xl border border-[#E5E5E5] p-5 mb-6">
        <h2 className="text-sm font-bold uppercase tracking-widest text-sage-600 mb-4">
          Materiales elegidos
        </h2>
        <MaterialesConImagenes materiales={(config.materiales as Record<string, string | null>) ?? {}} />
      </div>

      <div>
        <GestionPedidoPanel
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
          }}
        />
      </div>
    </div>
  );
}

function NarrativeView({ data }: { data: PedidoInput }) {
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
  return (
    <div className="space-y-6">
      {MATERIAL_CATEGORY_GROUPS.map((group) => {
        const seenKeys = new Set<string>();
        const cards = group.selectors.flatMap((selector) => {
          if (seenKeys.has(selector.key)) return [];
          seenKeys.add(selector.key);
          const found = findMaterialOption(selector.key, materiales[selector.key] ?? null);
          if (!found) return [];
          return [{ key: selector.key, ...found }];
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
                  {card.option.img && (
                    <div className="relative w-full aspect-square bg-stone-50">
                      <Image
                        src={card.option.img}
                        alt={card.option.label}
                        fill
                        className={card.selector.imageFit === "contain" ? "object-contain" : "object-cover"}
                      />
                    </div>
                  )}
                  <p className="text-xs text-stone-600 px-2 py-1.5 truncate">{card.option.label}</p>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
