import type { Metadata } from "next";
import AgendaBooking from "@/components/agenda/AgendaBooking";
import { SHOWROOM_DIRECCION } from "@/lib/agenda/showroom";

export const metadata: Metadata = {
  title: "Agendá tu visita al showroom — MOVARA",
  description: `Reservá un horario para conocer una unidad MOVARA en persona, en nuestro showroom de ${SHOWROOM_DIRECCION}.`,
};

export default function AgendarPage() {
  return (
    <div className="max-w-xl mx-auto px-6 py-12">
      <p className="text-sage-500 text-xs font-bold uppercase tracking-widest mb-1">
        Showroom MOVARA
      </p>
      <h1 className="text-2xl font-bold text-[#2F2F2F] mb-2">Agendá tu visita</h1>
      <p className="text-sm text-stone-600 mb-8">
        Elegí un día y horario para conocer una unidad MOVARA en persona, en {SHOWROOM_DIRECCION}.
      </p>
      <AgendaBooking />
    </div>
  );
}
