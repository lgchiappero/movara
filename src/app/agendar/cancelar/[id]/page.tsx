import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import CancelarCitaButton from "@/components/agenda/CancelarCitaButton";
import { SHOWROOM_DIRECCION } from "@/lib/agenda/showroom";

export const dynamic = "force-dynamic";

function fechaEs(fecha: Date): string {
  return fecha.toLocaleDateString("es-AR", {
    timeZone: "UTC",
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default async function CancelarCitaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const cita = await db.cita.findUnique({ where: { id } });

  if (!cita) notFound();

  return (
    <div className="max-w-md mx-auto px-6 py-12">
      <p className="text-sage-500 text-xs font-bold uppercase tracking-widest mb-1">
        Showroom MOVARA
      </p>
      <h1 className="text-2xl font-bold text-[#2F2F2F] mb-6">Tu visita</h1>

      <div className="bg-white rounded-2xl border border-[#E5E5E5] p-5 mb-6 space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-stone-500">Nombre</span>
          <span className="text-[#2F2F2F] font-medium">{cita.nombre}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-stone-500">Fecha</span>
          <span className="text-[#2F2F2F] font-medium">{fechaEs(cita.fecha)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-stone-500">Horario</span>
          <span className="text-[#2F2F2F] font-medium">{cita.horario} hs</span>
        </div>
        <div className="flex justify-between">
          <span className="text-stone-500">Dónde</span>
          <span className="text-[#2F2F2F] font-medium">{SHOWROOM_DIRECCION}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-stone-500">Estado</span>
          <span className="text-[#2F2F2F] font-medium capitalize">{cita.estado}</span>
        </div>
      </div>

      {cita.estado === "confirmada" && <CancelarCitaButton id={cita.id} />}

      {cita.estado === "cancelada" && (
        <div className="bg-stone-50 rounded-2xl border border-[#E5E5E5] p-6 text-center">
          <p className="text-sm text-stone-500">Esta visita ya está cancelada.</p>
        </div>
      )}

      {cita.estado === "completada" && (
        <div className="bg-stone-50 rounded-2xl border border-[#E5E5E5] p-6 text-center">
          <p className="text-sm text-stone-500">Esta visita ya se realizó.</p>
        </div>
      )}
    </div>
  );
}
