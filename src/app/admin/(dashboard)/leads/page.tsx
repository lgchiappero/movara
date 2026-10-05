import { db } from "@/lib/db";
import { buildLeadsWhere } from "@/lib/admin/leads-filtro";
import MarcarContactadoButton from "@/components/admin/MarcarContactadoButton";
import PaginacionLinks from "@/components/admin/PaginacionLinks";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

const inputClass =
  "w-full rounded-lg border border-[#E5E5E5] px-3 py-2 text-sm text-[#1a1a1a] bg-white focus:outline-none focus:ring-2 focus:ring-[#D4B06A]";

export default async function AdminLeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ desde?: string; hasta?: string; provincia?: string; sinResponder?: string; page?: string }>;
}) {
  const { desde, hasta, provincia, sinResponder, page: pageParam } = await searchParams;
  const where = buildLeadsWhere({ desde, hasta, provincia, sinResponder });
  const page = Math.max(1, Number(pageParam) || 1);

  const [leads, totalLeads] = await Promise.all([
    db.lead.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
    }),
    db.lead.count({ where }),
  ]);
  const totalPages = Math.max(1, Math.ceil(totalLeads / PAGE_SIZE));

  function buildHref(nuevaPagina: number): string {
    const params = new URLSearchParams();
    if (desde) params.set("desde", desde);
    if (hasta) params.set("hasta", hasta);
    if (provincia) params.set("provincia", provincia);
    if (sinResponder) params.set("sinResponder", sinResponder);
    if (nuevaPagina > 1) params.set("page", String(nuevaPagina));
    const qs = params.toString();
    return `/admin/leads${qs ? `?${qs}` : ""}`;
  }

  const exportParams = new URLSearchParams();
  if (desde) exportParams.set("desde", desde);
  if (hasta) exportParams.set("hasta", hasta);
  if (provincia) exportParams.set("provincia", provincia);
  if (sinResponder) exportParams.set("sinResponder", sinResponder);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[#D4B06A] text-xs font-bold uppercase tracking-widest mb-1">
            Panel MOVARA
          </p>
          <h1 className="text-2xl font-bold text-[#1a1a1a]">Leads</h1>
        </div>
        <a
          href={`/api/admin/leads/export?${exportParams.toString()}`}
          className="px-5 py-3 bg-[#D4B06A] hover:bg-[#c19f5a] text-[#1a1a1a] font-bold text-sm rounded-xl transition-colors"
        >
          Exportar CSV
        </a>
      </div>

      <form
        method="GET"
        className="bg-white rounded-2xl border border-[#E5E5E5] p-5 grid grid-cols-1 sm:grid-cols-4 gap-4"
      >
        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-stone-500">Desde</span>
          <input type="date" name="desde" defaultValue={desde} className={inputClass} />
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-stone-500">Hasta</span>
          <input type="date" name="hasta" defaultValue={hasta} className={inputClass} />
        </label>
        <label className="block space-y-1.5 sm:col-span-1">
          <span className="text-xs font-medium text-stone-500">Provincia</span>
          <input
            type="text"
            name="provincia"
            defaultValue={provincia}
            placeholder="Ej: Córdoba"
            className={inputClass}
          />
        </label>
        <label className="flex items-center gap-2 text-sm text-stone-600 sm:col-span-1">
          <input type="checkbox" name="sinResponder" value="1" defaultChecked={sinResponder === "1"} />
          Sin responder (+48hs)
        </label>
        <div className="flex items-end gap-2">
          <button
            type="submit"
            className="flex-1 py-2 bg-[#1a1a1a] hover:bg-[#2a2a2a] text-white font-bold text-sm rounded-lg transition-colors"
          >
            Filtrar
          </button>
          {(desde || hasta || provincia || sinResponder) && (
            <a
              href="/admin/leads"
              className="flex-1 text-center py-2 border border-stone-300 text-stone-600 hover:bg-stone-50 font-medium text-sm rounded-lg transition-colors"
            >
              Limpiar
            </a>
          )}
        </div>
      </form>

      {leads.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E5E5E5] p-10 text-center text-stone-500 text-sm">
          No hay leads que coincidan con estos filtros.
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#E5E5E5] overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E5E5E5] text-left text-stone-500 text-xs uppercase tracking-wide">
                <th className="px-5 py-3 font-medium">Nombre</th>
                <th className="px-5 py-3 font-medium">Email</th>
                <th className="px-5 py-3 font-medium">Teléfono</th>
                <th className="px-5 py-3 font-medium">Provincia</th>
                <th className="px-5 py-3 font-medium">Fecha</th>
                <th className="px-5 py-3 font-medium">Mensaje</th>
                <th className="px-5 py-3 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr key={lead.id} className="border-b border-[#F0F0F0] last:border-0 align-top">
                  <td className="px-5 py-3 font-medium text-[#1a1a1a] whitespace-nowrap">
                    {lead.nombre} {lead.apellido ?? ""}
                  </td>
                  <td className="px-5 py-3 text-stone-600">{lead.email || "—"}</td>
                  <td className="px-5 py-3 text-stone-600 whitespace-nowrap">{lead.telefono}</td>
                  <td className="px-5 py-3 text-stone-600">{lead.provincia || "—"}</td>
                  <td className="px-5 py-3 text-stone-500 whitespace-nowrap">
                    {lead.createdAt.toLocaleDateString("es-AR")}
                  </td>
                  <td className="px-5 py-3 text-stone-600 max-w-xs">{lead.mensaje || "—"}</td>
                  <td className="px-5 py-3">
                    <MarcarContactadoButton id={lead.id} contactado={lead.contactado} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <PaginacionLinks page={page} totalPages={totalPages} buildHref={buildHref} />
    </div>
  );
}
