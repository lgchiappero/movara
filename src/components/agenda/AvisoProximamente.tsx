import Link from "next/link";
import { getWhatsAppUrl } from "@/lib/whatsapp";
import { SHOWROOM_WHATSAPP_NUMBER } from "@/lib/agenda/showroom";

export const MENSAJE_WHATSAPP_PROXIMAMENTE = "Hola! Quiero visitar el showroom de MOVARA cuando abra.";

/** Reemplaza al calendario de /agendar mientras no hay ningún día habilitado
 * en los próximos 60 días (src/lib/agenda/ventana-agenda.ts). Sin fechas
 * fijas: cuando se habilitan días en el admin, vuelve el calendario solo.
 * El evento Contact del píxel lo dispara MetaPixel para todo link a wa.me. */
export default function AvisoProximamente() {
  return (
    <section
      aria-labelledby="agenda-proximamente"
      className="rounded-2xl border border-[#D4B36A]/30 bg-white/[0.03] p-6 sm:p-8 text-center"
    >
      <h2 id="agenda-proximamente" className="font-playfair font-medium text-2xl sm:text-3xl text-white leading-snug">
        Próximamente vas a poder agendar tu visita
      </h2>
      <p className="mt-4 text-stone-300 leading-relaxed">
        Estamos terminando nuestro showroom en Sunchales. Muy pronto vas a poder elegir día y horario desde acá.
        Mientras tanto, escribinos por WhatsApp y te contamos todo.
      </p>
      <a
        href={getWhatsAppUrl(MENSAJE_WHATSAPP_PROXIMAMENTE, SHOWROOM_WHATSAPP_NUMBER)}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-7 inline-flex w-full sm:w-auto items-center justify-center min-h-11 px-7 py-3 rounded-xl bg-[#D4B36A] hover:bg-[#c1a25a] text-[#1A1A1A] text-sm font-bold transition-colors"
      >
        Escribinos por WhatsApp
      </a>
      <p className="mt-5">
        <Link
          href="/configurador"
          className="inline-flex items-center min-h-11 text-sm font-semibold text-[#D4B36A] hover:text-[#e0c384] underline underline-offset-4 transition-colors"
        >
          Mientras tanto, diseñá tu MOVARA
        </Link>
      </p>
    </section>
  );
}
