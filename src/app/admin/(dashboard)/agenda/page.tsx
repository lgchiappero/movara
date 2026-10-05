import { db } from "@/lib/db";
import { dateToFechaKey } from "@/lib/agenda/fecha";
import AgendaVistaPanel, { type CitaAdmin } from "@/components/admin/AgendaVistaPanel";
import DisponibilidadPanel, { type DiaDisponibilidad } from "@/components/admin/DisponibilidadPanel";
import { getAdminUser } from "@/lib/admin/current-user";
import PaginacionLinks from "@/components/admin/PaginacionLinks";

// Vista lista: todas las citas (no solo las del mes), paginadas de a 50.
const PAGE_SIZE_LISTA = 50;

export const dynamic = "force-dynamic";

function parseMesParam(mes?: string): { anio: number; mesIdx0: number } {
  if (mes && /^\d{4}-\d{2}$/.test(mes)) {
    const [y, m] = mes.split("-").map(Number);
    if (m >= 1 && m <= 12) return { anio: y, mesIdx0: m - 1 };
  }
  const now = new Date();
  return { anio: now.getFullYear(), mesIdx0: now.getMonth() };
}

/** Como el pasado no se gestiona, un dispDesde anterior al mes actual se
 * ignora y vuelve al default — sin tope hacia adelante. */
function parseDispDesdeParam(dispDesde: string | undefined, now: Date): { anio: number; mesIdx0: number } {
  const nowTotal = now.getFullYear() * 12 + now.getMonth();
  if (dispDesde && /^\d{4}-\d{2}$/.test(dispDesde)) {
    const [y, m] = dispDesde.split("-").map(Number);
    if (m >= 1 && m <= 12 && y * 12 + (m - 1) >= nowTotal) {
      return { anio: y, mesIdx0: m - 1 };
    }
  }
  return { anio: now.getFullYear(), mesIdx0: now.getMonth() };
}

function serializeCita(c: {
  id: string;
  fecha: Date;
  horario: string;
  estado: string;
  tipoCliente: string;
  nombre: string;
  email: string;
  telefono: string;
  razonSocial: string | null;
  consulta: string;
  canceladaPor: string | null;
  motivoCancelacion: string | null;
}): CitaAdmin {
  return { ...c, fechaKey: dateToFechaKey(c.fecha) };
}

export default async function AgendaAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string; vista?: string; tab?: string; dispDesde?: string; citaId?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const { anio, mesIdx0 } = parseMesParam(sp.mes);
  const vistaLista = sp.vista === "lista";
  const pagina = Math.max(1, Number(sp.page) || 1);

  const desdeMes = new Date(Date.UTC(anio, mesIdx0, 1));
  const hastaMes = new Date(Date.UTC(anio, mesIdx0 + 1, 1));

  const now = new Date();
  const { anio: dispAnio, mesIdx0: dispMesIdx0 } = parseDispDesdeParam(sp.dispDesde, now);
  const desdeDisp = new Date(Date.UTC(dispAnio, dispMesIdx0, 1));
  const hastaDisp = new Date(Date.UTC(dispAnio, dispMesIdx0 + 3, 1));

  const [session, citasDelMes, todasLasCitas, totalCitas, disponibilidadRows, citasEnRangoDisp] = await Promise.all([
    getAdminUser(),
    db.cita.findMany({
      where: { fecha: { gte: desdeMes, lt: hastaMes } },
      orderBy: [{ fecha: "asc" }, { horario: "asc" }],
    }),
    vistaLista
      ? db.cita.findMany({
          orderBy: [{ fecha: "desc" }, { horario: "asc" }],
          take: PAGE_SIZE_LISTA,
          skip: (pagina - 1) * PAGE_SIZE_LISTA,
        })
      : Promise.resolve([]),
    vistaLista ? db.cita.count() : Promise.resolve(0),
    db.disponibilidadAgenda.findMany({ where: { fecha: { gte: desdeDisp, lt: hastaDisp } } }),
    db.cita.findMany({
      where: { fecha: { gte: desdeDisp, lt: hastaDisp }, estado: { not: "cancelada" } },
      select: { fecha: true },
    }),
  ]);

  const disponibilidad: DiaDisponibilidad[] = disponibilidadRows.map((d) => ({
    fechaKey: dateToFechaKey(d.fecha),
    habilitada: d.habilitada,
    horarios: d.horarios,
  }));

  const diasConCitas = Array.from(new Set(citasEnRangoDisp.map((c) => dateToFechaKey(c.fecha))));

  return (
    <div className="max-w-5xl mx-auto px-6 py-12 space-y-10">
      <div>
        <p className="text-sage-500 text-xs font-bold uppercase tracking-widest mb-1">
          Panel MOVARA
        </p>
        <h1 className="text-2xl font-bold text-[#2F2F2F]">Agenda del showroom</h1>
      </div>

      <section>
        <h2 className="text-sm font-bold uppercase tracking-widest text-sage-600 mb-4">
          Vista de agenda
        </h2>
        <AgendaVistaPanel
          anio={anio}
          mesIdx0={mesIdx0}
          vista={vistaLista ? "lista" : "calendario"}
          citasDelMes={citasDelMes.map(serializeCita)}
          todasLasCitas={todasLasCitas.map(serializeCita)}
          citaIdInicial={sp.citaId ?? null}
          rol={session?.rol ?? "vendedor"}
        />
        {vistaLista && (
          <PaginacionLinks
            page={pagina}
            totalPages={Math.max(1, Math.ceil(totalCitas / PAGE_SIZE_LISTA))}
            buildHref={(n) => `/admin/agenda?mes=${anio}-${String(mesIdx0 + 1).padStart(2, "0")}&vista=lista${n > 1 ? `&page=${n}` : ""}`}
          />
        )}
      </section>

      <section>
        <h2 className="text-sm font-bold uppercase tracking-widest text-sage-600 mb-4">
          Gestión de disponibilidad
        </h2>
        <DisponibilidadPanel
          anioInicial={dispAnio}
          mesInicial={dispMesIdx0}
          disponibilidad={disponibilidad}
          diasConCitas={diasConCitas}
        />
      </section>
    </div>
  );
}
