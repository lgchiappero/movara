import { ORIGEN_VISITA_COLORS, ORIGEN_VISITA_LABELS, esOrigenVisita } from "@/lib/origen-visita/clasificar";

/** Origen web (utm/referrer de la primera visita) y campaña, o "—". */
export default function OrigenVisitaChip({
  origenVisita,
  campana,
}: {
  origenVisita: string | null;
  campana: string | null;
}) {
  if (!esOrigenVisita(origenVisita)) return <span className="text-stone-400">—</span>;
  return (
    <span className="inline-flex flex-col items-start gap-0.5">
      <span className={`px-2 py-1 rounded-full text-xs font-bold whitespace-nowrap ${ORIGEN_VISITA_COLORS[origenVisita]}`}>
        {ORIGEN_VISITA_LABELS[origenVisita]}
      </span>
      {campana && (
        <span className="text-[11px] text-stone-500 max-w-[160px] truncate" title={campana}>
          {campana}
        </span>
      )}
    </span>
  );
}
