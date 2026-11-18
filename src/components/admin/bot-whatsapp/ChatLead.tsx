import { formatearFechaHoraAR } from "@/lib/fecha-ar";
import type { Autor } from "@/lib/bot-whatsapp/constantes";

export type Mensaje = { id: string; autor: string; tipo: string; contenido: string; creadoEn: Date | string };

const ESTILO: Record<Autor, { fila: string; burbuja: string; quien: string }> = {
  CLIENTE: { fila: "justify-start", burbuja: "bg-white border border-[#E5E5E5] text-[#1A1A1A]", quien: "Cliente" },
  BOT: { fila: "justify-end", burbuja: "bg-[#1A1A1A] text-stone-100", quien: "Bot" },
  EQUIPO: { fila: "justify-end", burbuja: "bg-[#D4B36A] text-[#1A1A1A]", quien: "Equipo" },
};

/** Conversación estilo chat: cliente a la izquierda; bot (negro) y equipo
 * (dorado) a la derecha. */
export default function ChatLead({ mensajes }: { mensajes: Mensaje[] }) {
  if (mensajes.length === 0) {
    return <p className="rounded-2xl border border-[#E5E5E5] bg-white p-6 text-center text-sm text-stone-500">Todavía no hay mensajes.</p>;
  }
  return (
    <ol aria-label="Conversación" className="space-y-3 rounded-2xl bg-stone-100 p-4">
      {mensajes.map((m) => {
        const e = ESTILO[m.autor as Autor] ?? ESTILO.CLIENTE;
        return (
          <li key={m.id} data-autor={m.autor} className={`flex ${e.fila}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 shadow-sm sm:max-w-[70%] ${e.burbuja}`}>
              <p className="text-[11px] font-semibold uppercase tracking-wider opacity-70">{e.quien}</p>
              <p className="whitespace-pre-wrap break-words text-sm">
                {m.tipo === "AUDIO" ? "🎤 Audio" : m.tipo === "OTRO" && !m.contenido ? "📎 Adjunto" : m.contenido}
              </p>
              <p className="mt-1 text-right text-[11px] opacity-60">{formatearFechaHoraAR(m.creadoEn)}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
