import Link from "next/link";
import { db } from "@/lib/db";
import { getAdminUser } from "@/lib/admin/current-user";
import { isAdmin } from "@/lib/admin/roles";
import { gastoDelMes, obtenerConfigBot } from "@/lib/bot-whatsapp/config";
import { listarLeads } from "@/lib/bot-whatsapp/leads";
import { ESTADOS_LEAD, ETIQUETA_ESTADO, type HorarioAtencion, type ModoRespaldo } from "@/lib/bot-whatsapp/constantes";
import { leadsQuerySchema } from "@/lib/validators/bot-whatsapp";
import EstadoBot from "@/components/admin/bot-whatsapp/EstadoBot";
import ConfigBotForm from "@/components/admin/bot-whatsapp/ConfigBotForm";
import TablaLeadsWhatsapp from "@/components/admin/bot-whatsapp/TablaLeadsWhatsapp";
import NuevoLeadWhatsapp from "@/components/admin/bot-whatsapp/NuevoLeadWhatsapp";
import ContactosExcluidos from "@/components/admin/bot-whatsapp/ContactosExcluidos";
import PaginacionLinks from "@/components/admin/PaginacionLinks";

export const dynamic = "force-dynamic";

type Vista = "leads" | "excluidos" | "configuracion";

const input =
  "w-full rounded-lg border border-[#E5E5E5] bg-white px-3 py-2.5 text-base sm:text-sm text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#D4B36A]";

export default async function BotWhatsappPage({
  searchParams,
}: {
  searchParams: Promise<{ vista?: string; estado?: string; q?: string; pagina?: string }>;
}) {
  const sp = await searchParams;
  const sesion = await getAdminUser();
  const esAdmin = sesion ? isAdmin(sesion.rol) : false;
  // El vendedor no tiene la pestaña de configuración (el servidor también
  // rechaza sus cambios).
  const vista: Vista = sp.vista === "excluidos" ? "excluidos" : sp.vista === "configuracion" && esAdmin ? "configuracion" : "leads";

  const config = await obtenerConfigBot();
  const gasto = await gastoDelMes(config.topeGastoMensualUsd);

  const filtro = leadsQuerySchema.safeParse({ estado: sp.estado || undefined, q: sp.q || undefined, pagina: sp.pagina || 1 });
  const f = filtro.success ? filtro.data : { pagina: 1 as number };

  const pestanas: { id: Vista; nombre: string }[] = [
    { id: "leads", nombre: "Leads" },
    { id: "excluidos", nombre: "Contactos excluidos" },
    ...(esAdmin ? [{ id: "configuracion" as const, nombre: "Configuración" }] : []),
  ];

  // Los datos de cada pestaña se cargan acá (los subcomponentes son
  // sincrónicos): solo lo de la pestaña visible.
  const datosLeads = vista === "leads" ? await listarLeads(f) : null;
  const excluidos =
    vista === "excluidos"
      ? await db.contactoExcluido.findMany({ orderBy: { creadoEn: "desc" }, select: { id: true, telefono: true, etiqueta: true } })
      : null;

  function hrefPagina(pagina: number) {
    const p = new URLSearchParams();
    if (f.estado) p.set("estado", f.estado);
    if (f.q) p.set("q", f.q);
    if (pagina > 1) p.set("pagina", String(pagina));
    const qs = p.toString();
    return `/admin/bot-whatsapp${qs ? `?${qs}` : ""}`;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <p className="mb-1 text-xs font-bold uppercase tracking-widest text-[#D4B36A]">Panel MOVARA</p>
        <h1 className="text-2xl font-bold text-[#1A1A1A]">Bot de WhatsApp</h1>
      </div>

      <EstadoBot activo={config.activo} gasto={gasto} esAdmin={esAdmin} />

      <nav aria-label="Secciones del bot" className="flex gap-1 overflow-x-auto border-b border-[#E5E5E5]">
        {pestanas.map((p) => (
          <Link
            key={p.id}
            href={p.id === "leads" ? "/admin/bot-whatsapp" : `/admin/bot-whatsapp?vista=${p.id}`}
            aria-current={vista === p.id ? "page" : undefined}
            className={`inline-flex min-h-11 shrink-0 items-center border-b-2 px-4 text-sm font-semibold ${
              vista === p.id ? "border-[#D4B36A] text-[#1A1A1A]" : "border-transparent text-stone-500 hover:text-[#1A1A1A]"
            }`}
          >
            {p.nombre}
          </Link>
        ))}
      </nav>

      {vista === "configuracion" && (
        <ConfigBotForm
          inicial={{
            modoHorario: config.modoHorario,
            horarioAtencion: config.horarioAtencion as HorarioAtencion,
            modoRespaldo: config.modoRespaldo as ModoRespaldo,
            mensajeBienvenida: config.mensajeBienvenida,
            topeGastoMensualUsd: config.topeGastoMensualUsd,
            emailAviso: config.emailAviso,
            whatsappAviso: config.whatsappAviso,
            maxRespuestasPorLead: config.maxRespuestasPorLead,
          }}
        />
      )}

      {excluidos && <ContactosExcluidos esAdmin={esAdmin} excluidos={excluidos} />}

      {datosLeads && <LeadsVista filtro={f} datos={datosLeads} hrefPagina={hrefPagina} />}
    </div>
  );
}

function LeadsVista({
  filtro,
  datos: { leads, total, pagina, paginas },
  hrefPagina,
}: {
  filtro: { estado?: (typeof ESTADOS_LEAD)[number]; q?: string; pagina: number };
  datos: Awaited<ReturnType<typeof listarLeads>>;
  hrefPagina: (p: number) => string;
}) {
  return (
    <section aria-labelledby="titulo-leads" className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 id="titulo-leads" className="text-lg font-bold text-[#1A1A1A]">
          Leads <span className="text-sm font-normal text-stone-500">({total})</span>
        </h2>
        <NuevoLeadWhatsapp />
      </div>
      <form method="get" action="/admin/bot-whatsapp" className="grid gap-3 rounded-2xl border border-[#E5E5E5] bg-white p-4 sm:grid-cols-[12rem_1fr_auto]">
        <select name="estado" aria-label="Filtrar por estado" defaultValue={filtro.estado ?? ""} className={input}>
          <option value="">Todos los estados</option>
          {ESTADOS_LEAD.map((e) => (
            <option key={e} value={e}>
              {ETIQUETA_ESTADO[e]}
            </option>
          ))}
        </select>
        <input name="q" type="search" aria-label="Buscar por nombre o teléfono" placeholder="Buscar por nombre o teléfono" defaultValue={filtro.q ?? ""} className={input} />
        <button type="submit" className="min-h-11 rounded-xl bg-[#1A1A1A] px-5 text-sm font-bold text-[#D4B36A] hover:bg-[#2a2a2a]">
          Filtrar
        </button>
      </form>
      <TablaLeadsWhatsapp leads={leads} />
      <PaginacionLinks page={pagina} totalPages={paginas} buildHref={hrefPagina} />
    </section>
  );
}
