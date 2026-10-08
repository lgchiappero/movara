import type { TextoRecibo } from "@/lib/recibos/texto";

/** Texto del recibo en solo lectura, en una tarjeta con scroll propio. */
export default function TextoReciboCard({ texto }: { texto: TextoRecibo }) {
  return (
    <div
      tabIndex={0}
      aria-label="Texto del Recibo en Conformidad"
      className="bg-[#222] border border-white/5 rounded-2xl p-5 max-h-[52vh] overflow-y-auto text-[13px] leading-relaxed text-stone-300 focus:outline-none focus:ring-1 focus:ring-[#D4B36A]/40"
    >
      <p className="text-center text-xs font-semibold tracking-widest text-stone-100">{texto.titulo}</p>
      <p className="text-center text-xs text-[#D4B36A] mt-1 mb-4">{texto.numero}</p>
      <p className="mb-3">{texto.encabezado}</p>
      {texto.clausulas.map((c) => (
        <p key={c.titulo} className="mb-3 last:mb-0">
          <span className="font-semibold text-stone-100">{c.titulo}:</span> {c.texto}
        </p>
      ))}
    </div>
  );
}
