import Link from "next/link";
import { db } from "@/lib/db";
import NuevoClienteForm from "@/components/admin/NuevoClienteForm";

export const dynamic = "force-dynamic";

async function getClientes() {
  return db.cliente.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { unidades: true } } },
  });
}

export default async function AdminClientesPage() {
  const clientes = await getClientes();

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <p className="text-sage-500 text-xs font-bold uppercase tracking-widest mb-1">
            Panel MOVARA
          </p>
          <h1 className="text-2xl font-bold text-[#2F2F2F]">Clientes</h1>
        </div>
        <NuevoClienteForm />
      </div>

      {clientes.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E5E5E5] p-10 text-center text-stone-500 text-sm">
          Todavía no hay clientes cargados.
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#E5E5E5] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E5E5E5] text-left text-stone-500 text-xs uppercase tracking-wide">
                <th className="px-5 py-3 font-medium">Nombre</th>
                <th className="px-5 py-3 font-medium">Email</th>
                <th className="px-5 py-3 font-medium">Teléfono</th>
                <th className="px-5 py-3 font-medium">Unidades</th>
                <th className="px-5 py-3 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {clientes.map((c) => (
                <tr key={c.id} className="border-b border-[#F0F0F0] last:border-0">
                  <td className="px-5 py-3 font-medium text-[#2F2F2F]">{c.nombre}</td>
                  <td className="px-5 py-3 text-stone-600">{c.email || "—"}</td>
                  <td className="px-5 py-3 text-stone-600">{c.telefono || "—"}</td>
                  <td className="px-5 py-3 text-stone-600">{c._count.unidades}</td>
                  <td className="px-5 py-3">
                    <Link
                      href={`/admin/clientes/${c.id}`}
                      className="text-sage-600 hover:text-sage-700 font-medium"
                    >
                      Ver detalle
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
