import NuevaConfiguracionForm from "@/components/admin/NuevaConfiguracionForm";

export default function NuevaConfiguracionPage() {
  return (
    <div className="max-w-md mx-auto px-6 py-12">
      <p className="text-sage-500 text-xs font-bold uppercase tracking-widest mb-1">
        Panel MOVARA
      </p>
      <h1 className="text-2xl font-bold text-[#2F2F2F] mb-8">Nueva configuración</h1>
      <NuevaConfiguracionForm />
    </div>
  );
}
