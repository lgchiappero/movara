import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import ConfiguradorPedidoForm from "@/components/pedido/ConfiguradorPedidoForm";

export const dynamic = "force-dynamic";

export default async function PedidoPage({
  params,
}: {
  params: Promise<{ configId: string }>;
}) {
  const { configId } = await params;
  const config = await db.configuracionPedido.findUnique({ where: { id: configId } });

  if (!config) notFound();

  if (config.estado !== "pendiente") {
    return (
      <div className="max-w-lg mx-auto px-6 py-16 text-center">
        <div className="bg-[#2F2F2F] rounded-2xl p-8">
          <p className="text-sage-500 text-xs font-bold uppercase tracking-widest mb-3">
            Ya completada
          </p>
          <h1 className="text-white text-xl font-bold mb-3">
            {config.clienteNombre}, ya recibimos tu configuración
          </h1>
          <p className="text-stone-300 text-sm leading-relaxed">
            Luciano ya tiene el detalle que enviaste. Si necesitás cambiar algo, escribile
            directamente por WhatsApp.
          </p>
        </div>
      </div>
    );
  }

  return (
    <ConfiguradorPedidoForm
      configId={configId}
      initialNombre={config.clienteNombre}
      initialWhatsapp={config.clienteWhatsapp ?? ""}
    />
  );
}
