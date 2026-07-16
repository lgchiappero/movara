import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { buildPedidoNarrativeEs } from "@/lib/pdf/pedido-narrative-es";
import type { PedidoInput } from "@/lib/validators/pedido";
import CopyLinkButton from "@/components/admin/CopyLinkButton";

export const dynamic = "force-dynamic";

const ESTADO_LABELS: Record<string, string> = {
  pendiente: "Pendiente",
  enviado: "Enviado",
  revisado: "Revisado",
  confirmado: "Confirmado",
};

export default async function ConfiguracionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const config = await db.configuracionPedido.findUnique({ where: { id } });

  if (!config) notFound();

  const pendiente = config.estado === "pendiente";

  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      <Link href="/admin/configuraciones" className="text-sm text-stone-500 hover:text-stone-700">
        ← Volver a la lista
      </Link>

      <div className="flex items-center justify-between mt-4 mb-8">
        <div>
          <p className="text-sage-500 text-xs font-bold uppercase tracking-widest mb-1">
            {ESTADO_LABELS[config.estado] ?? config.estado}
          </p>
          <h1 className="text-2xl font-bold text-[#2F2F2F]">{config.clienteNombre}</h1>
        </div>
        {!pendiente && (
          <a
            href={`/api/admin/configuraciones/${id}/pdf`}
            className="px-5 py-3 bg-sage-500 hover:bg-sage-600 text-[#2F2F2F] font-bold text-sm rounded-xl transition-colors"
          >
            Descargar PDF
          </a>
        )}
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
          <span className="text-stone-500">Creado</span>
          <span className="text-[#2F2F2F] font-medium">
            {config.createdAt.toLocaleDateString("es-AR")}
          </span>
        </div>
      </div>

      {pendiente ? (
        <div className="bg-[#2F2F2F] rounded-2xl p-6">
          <p className="text-stone-300 text-sm mb-4">
            Esta configuración todavía no fue completada por el cliente. Compartile este link:
          </p>
          <CopyLinkButton path={`/pedido/${id}`} />
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#E5E5E5] p-5">
          <h2 className="text-sm font-bold uppercase tracking-widest text-sage-600 mb-4">
            Configuración completa
          </h2>
          <NarrativeView data={config as unknown as PedidoInput} />
        </div>
      )}
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
