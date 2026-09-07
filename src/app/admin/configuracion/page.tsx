import { parseAdminUsers } from "@/lib/admin/auth-users";

export default function AdminConfiguracionPage() {
  const users = parseAdminUsers();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <p className="text-[#D4B06A] text-xs font-bold uppercase tracking-widest mb-1">
          Panel MOVARA
        </p>
        <h1 className="text-2xl font-bold text-[#1a1a1a]">Configuración</h1>
      </div>

      <div className="bg-white rounded-2xl border border-[#E5E5E5] p-5">
        <h2 className="text-sm font-bold uppercase tracking-widest text-stone-500 mb-4">
          Usuarios del panel
        </h2>
        <ul className="divide-y divide-[#F0F0F0]">
          {users.map((u) => (
            <li key={u.user} className="py-3 flex items-center justify-between text-sm">
              <span className="font-medium text-[#1a1a1a]">{u.user}</span>
              <span className="px-2 py-1 rounded-full text-xs font-bold bg-[#f5f5f5] text-stone-600">
                {u.rol}
              </span>
            </li>
          ))}
        </ul>
        <p className="text-xs text-stone-400 mt-4">
          Para agregar o cambiar usuarios, editá la variable de entorno{" "}
          <code className="bg-[#f5f5f5] px-1 py-0.5 rounded">ADMIN_USERS</code>.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-[#E5E5E5] p-5 text-sm text-stone-400">
        Más opciones de configuración próximamente.
      </div>
    </div>
  );
}
