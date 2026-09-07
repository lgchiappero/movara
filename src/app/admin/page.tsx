import Link from "next/link";
import { db } from "@/lib/db";
import { estadoPedidoOptions, estadoPedidoLabels, type EstadoPedido } from "@/lib/pedido/estado-pedido";
import { getAdminUser } from "@/lib/admin/current-user";
import { isAllowedForRole } from "@/lib/admin/auth-users";
import { ADMIN_NAV_ITEMS } from "@/lib/admin/nav-items";

export const dynamic = "force-dynamic";

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function startOfWeek(d: Date): Date {
  const x = startOfDay(d);
  const day = x.getDay();
  const diffToMonday = day === 0 ? 6 : day - 1;
  x.setDate(x.getDate() - diffToMonday);
  return x;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export default async function AdminDashboardPage() {
  const now = new Date();

  const [leadsHoy, leadsSemana, leadsMes, estadoCounts, ultimasConsultas, session] = await Promise.all([
    db.lead.count({ where: { createdAt: { gte: startOfDay(now) } } }),
    db.lead.count({ where: { createdAt: { gte: startOfWeek(now) } } }),
    db.lead.count({ where: { createdAt: { gte: startOfMonth(now) } } }),
    db.configuracionPedido.groupBy({ by: ["estadoPedido"], _count: { _all: true } }),
    db.configuracionPedido.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, clienteNombre: true, numeroConsulta: true, estadoPedido: true, createdAt: true },
    }),
    getAdminUser(),
  ]);

  const rol = session?.rol ?? "editor";
  const countByEstado = Object.fromEntries(
    estadoCounts.map((e) => [e.estadoPedido, e._count._all])
  ) as Record<string, number>;

  const accesosRapidos = ADMIN_NAV_ITEMS.filter(
    (item) => item.href !== "/admin" && isAllowedForRole(rol, item.href)
  );

  return (
    <div className="space-y-8">
      <div>
        <p className="text-[#D4B06A] text-xs font-bold uppercase tracking-widest mb-1">Panel MOVARA</p>
        <h1 className="text-2xl font-bold text-[#1a1a1a]">Dashboard</h1>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Leads hoy" value={leadsHoy} />
        <StatCard label="Leads esta semana" value={leadsSemana} />
        <StatCard label="Leads este mes" value={leadsMes} />
      </div>

      <div className="bg-white rounded-2xl border border-[#E5E5E5] p-5">
        <h2 className="text-sm font-bold uppercase tracking-widest text-stone-500 mb-4">
          Pedidos por estado
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {estadoPedidoOptions.map((estado) => (
            <div key={estado} className="text-center bg-[#f5f5f5] rounded-xl py-4">
              <p className="text-2xl font-bold text-[#1a1a1a]">{countByEstado[estado] ?? 0}</p>
              <p className="text-xs text-stone-500 mt-1">{estadoPedidoLabels[estado]}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-[#E5E5E5] p-5">
        <h2 className="text-sm font-bold uppercase tracking-widest text-stone-500 mb-4">
          Últimas consultas
        </h2>
        {ultimasConsultas.length === 0 ? (
          <p className="text-sm text-stone-400">Todavía no llegó ninguna consulta.</p>
        ) : (
          <ul className="divide-y divide-[#F0F0F0]">
            {ultimasConsultas.map((c) => (
              <li key={c.id} className="py-3 flex items-center justify-between text-sm">
                <div>
                  <p className="font-medium text-[#1a1a1a]">{c.clienteNombre}</p>
                  <p className="text-xs text-stone-400 font-mono">{c.numeroConsulta ?? "—"}</p>
                </div>
                <div className="text-right">
                  <span className="px-2 py-1 rounded-full text-xs font-bold bg-[#f5f5f5] text-stone-600">
                    {estadoPedidoLabels[c.estadoPedido as EstadoPedido] ?? c.estadoPedido}
                  </span>
                  <p className="text-xs text-stone-400 mt-1">
                    {c.createdAt.toLocaleDateString("es-AR")}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
        {isAllowedForRole(rol, "/admin/configuraciones") && (
          <Link
            href="/admin/configuraciones"
            className="inline-block mt-4 text-sm text-[#D4B06A] font-bold hover:underline"
          >
            Ver todos los pedidos →
          </Link>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-[#E5E5E5] p-5">
        <h2 className="text-sm font-bold uppercase tracking-widest text-stone-500 mb-2">
          Google Analytics 4
        </h2>
        <div className="bg-[#f5f5f5] rounded-xl h-48 flex items-center justify-center text-stone-400 text-sm text-center px-6">
          GA4 aún no configurado. Cuando tengas el ID de propiedad, este espacio va a mostrar el
          reporte embebido.
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {accesosRapidos.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="bg-white rounded-2xl border border-[#E5E5E5] p-5 text-center hover:border-[#D4B06A] transition-colors"
          >
            <span className="text-2xl" aria-hidden>
              {item.icon}
            </span>
            <p className="text-sm font-bold text-[#1a1a1a] mt-2">{item.label}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white rounded-2xl border border-[#E5E5E5] p-5">
      <p className="text-3xl font-bold text-[#1a1a1a]">{value}</p>
      <p className="text-sm text-stone-500 mt-1">{label}</p>
    </div>
  );
}
