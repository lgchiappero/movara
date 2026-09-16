import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import CitaCancelarView from "@/components/agenda/CitaCancelarView";

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

      <CitaCancelarView
        cita={{
          id: cita.id,
          nombre: cita.nombre,
          fechaEs: fechaEs(cita.fecha),
          horario: cita.horario,
          estado: cita.estado,
        }}
      />
    </div>
  );
}
