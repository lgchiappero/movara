import { db } from "@/lib/db";
import { dateToFechaKey } from "@/lib/agenda/fecha";
import AgendaVistaPanel, { type CitaAdmin } from "@/components/admin/AgendaVistaPanel";
import DisponibilidadPanel, { type DiaDisponibilidad } from "@/components/admin/DisponibilidadPanel";

export const dynamic = "force-dynamic";

function parseMesParam(mes?: string): { anio: number; mesIdx0: number } {
  if (mes && /^\d{4}-\d{2}$/.test(mes)) {
    const [y, m] = mes.split("-").map(Number);
    if (m >= 1 && m <= 12) return { anio: y, mesIdx0: m - 1 };
  }
  const now = new Date();
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
  searchParams: Promise<{ mes?: string; vista?: string; tab?: string }>;
}) {
  const sp = await searchParams;
  const { anio, mesIdx0 } = parseMesParam(sp.mes);
  const vistaLista = sp.vista === "lista";

  const desdeMes = new Date(Date.UTC(anio, mesIdx0, 1));
  const hastaMes = new Date(Date.UTC(anio, mesIdx0 + 1, 1));

  const now = new Date();
  const desdeDisp = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1));
  const hastaDisp = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 3, 1));

  const [citasDelMes, todasLasCitas, disponibilidadRows] = await Promise.all([
    db.cita.findMany({
      where: { fecha: { gte: desdeMes, lt: hastaMes } },
      orderBy: [{ fecha: "asc" }, { horario: "asc" }],
    }),
    vistaLista
      ? db.cita.findMany({ orderBy: [{ fecha: "desc" }, { horario: "asc" }] })
      : Promise.resolve([]),
    db.disponibilidadAgenda.findMany({ where: { fecha: { gte: desdeDisp, lt: hastaDisp } } }),
  ]);

  const disponibilidad: DiaDisponibilidad[] = disponibilidadRows.map((d) => ({
    fechaKey: dateToFechaKey(d.fecha),
    habilitada: d.habilitada,
    horarios: d.horarios,
  }));

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
        />
      </section>

      <section>
        <h2 className="text-sm font-bold uppercase tracking-widest text-sage-600 mb-4">
          Gestión de disponibilidad
        </h2>
        <DisponibilidadPanel
          anioInicial={now.getFullYear()}
          mesInicial={now.getMonth()}
          disponibilidad={disponibilidad}
        />
      </section>
    </div>
  );
}
