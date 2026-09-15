import Link from "next/link";

export default function AdminConfiguracionPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <p className="text-[#D4B06A] text-xs font-bold uppercase tracking-widest mb-1">
          Panel MOVARA
        </p>
        <h1 className="text-2xl font-bold text-[#1a1a1a]">Configuración</h1>
      </div>

      <div className="bg-white rounded-2xl border border-[#E5E5E5] p-5 text-sm text-stone-600">
        La gestión de usuarios del panel se mudó a su propia sección.{" "}
        <Link href="/admin/usuarios" className="text-[#D4B06A] font-bold hover:underline">
          Ir a Usuarios →
        </Link>
      </div>

      <div className="bg-white rounded-2xl border border-[#E5E5E5] p-5 text-sm text-stone-400">
        Más opciones de configuración próximamente.
      </div>
    </div>
  );
}
