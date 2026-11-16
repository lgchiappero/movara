import type { Metadata } from "next";
import AgendaBooking from "@/components/agenda/AgendaBooking";
import ComoLlegarLink from "@/components/agenda/ComoLlegarLink";
import { SHOWROOM_DIRECCION } from "@/lib/agenda/showroom";

export const metadata: Metadata = {
  title: "Agendá tu visita al showroom — MOVARA",
  description: `Reservá un horario para conocer una unidad MOVARA en persona, en nuestro showroom de ${SHOWROOM_DIRECCION}.`,
};

export default function AgendarPage() {
  return (
    <div className="bg-[#1A1A1A] min-h-screen">
      <div className="max-w-xl mx-auto px-6 pt-28 pb-16">
        <p className="text-[#D4B36A] text-xs font-semibold uppercase tracking-widest mb-3">Showroom MOVARA</p>
        <h1 className="font-playfair font-medium text-3xl sm:text-4xl text-white mb-3">Agendá tu visita</h1>
        {/* Texto neutro: vale con el calendario y con el aviso "Próximamente". */}
        <p className="text-sm text-stone-300 mb-1">Conocé una unidad MOVARA en persona, en {SHOWROOM_DIRECCION}.</p>
        <ComoLlegarLink className="inline-block mb-8" />
        <AgendaBooking />
      </div>
    </div>
  );
}
