import { db } from "@/lib/db";
import { MAX_USUARIOS } from "@/lib/validators/admin-usuarios";
import UsuariosPanel from "@/components/admin/UsuariosPanel";

export const dynamic = "force-dynamic";

export default async function AdminUsuariosPage() {
  const usuarios = await db.adminUser.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      nombre: true,
      email: true,
      rol: true,
      activo: true,
      ultimoLogin: true,
    },
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <p className="text-[#D4B06A] text-xs font-bold uppercase tracking-widest mb-1">
          Panel MOVARA
        </p>
        <h1 className="text-2xl font-bold text-[#1a1a1a]">Usuarios</h1>
        <p className="text-sm text-stone-500 mt-1">
          Hasta {MAX_USUARIOS} usuarios con acceso al panel.
        </p>
      </div>

      <UsuariosPanel
        initialUsuarios={usuarios.map((u) => ({
          ...u,
          ultimoLogin: u.ultimoLogin?.toISOString() ?? null,
        }))}
      />
    </div>
  );
}
