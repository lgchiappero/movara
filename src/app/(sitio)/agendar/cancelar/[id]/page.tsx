import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import CitaCancelarView from "@/components/agenda/CitaCancelarView";
import { formatearSoloFecha } from "@/lib/fecha-ar";

export const dynamic = "force-dynamic";

// La URL lleva el id de la cita: fuera de los buscadores y sin Referer.
export const metadata: Metadata = {
  title: "Cancelar visita — MOVARA",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

function fechaEs(fecha: Date): string {
  return formatearSoloFecha(fecha, "largoConDia");
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
    <div className="bg-[#1A1A1A] min-h-screen">
      <div className="max-w-md mx-auto px-6 pt-28 pb-16">
        <p className="text-[#D4B36A] text-xs font-semibold uppercase tracking-widest mb-3">
          Showroom MOVARA
        </p>
        <h1 className="font-playfair font-medium text-3xl text-white mb-6">Tu visita</h1>

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
    </div>
  );
}
