import BuscarPedidoForm from "@/components/mi-pedido/BuscarPedidoForm";

export default async function MiPedidoPage({
  searchParams,
}: {
  searchParams: Promise<{ t?: string | string[] }>;
}) {
  const { t } = await searchParams;
  const token = typeof t === "string" && t.trim() ? t.trim() : null;

  return (
    <div className="max-w-xl mx-auto px-6 py-12">
      <p className="text-sage-500 text-xs font-bold uppercase tracking-widest mb-1">
        Panel MOVARA
      </p>
      <h1 className="text-2xl font-bold text-[#2F2F2F] mb-2">Seguí tu pedido</h1>
      <p className="text-sm text-stone-600 mb-8">
        Abrí el link de seguimiento que te enviamos por email o WhatsApp para ver el estado de tu MOVARA.
      </p>
      <BuscarPedidoForm token={token} />
    </div>
  );
}
