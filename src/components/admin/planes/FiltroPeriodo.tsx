"use client";

import { FILTRO_PERIODO_OPTIONS, FILTRO_PERIODO_LABELS, type FiltroPeriodo as Filtro } from "@/lib/cobranza/planes-unidad";

export const selectFiltroClass = "rounded-lg border border-[#E5E5E5] px-2.5 py-1.5 text-sm text-[#2F2F2F] bg-white";

/** Selector de período (Todo el historial | Este mes | Mes anterior | Este
 * trimestre | Rango personalizado) con las fechas del rango personalizado —
 * el mismo en Cobranza y en Pagos. */
export default function FiltroPeriodo({
  valor,
  desde,
  hasta,
  onValor,
  onDesde,
  onHasta,
}: {
  valor: Filtro;
  desde: string;
  hasta: string;
  onValor: (v: Filtro) => void;
  onDesde: (v: string) => void;
  onHasta: (v: string) => void;
}) {
  return (
    <>
      <select aria-label="Filtrar por período" value={valor} onChange={(e) => onValor(e.target.value as Filtro)} className={selectFiltroClass}>
        {FILTRO_PERIODO_OPTIONS.map((p) => (
          <option key={p} value={p}>
            {FILTRO_PERIODO_LABELS[p]}
          </option>
        ))}
      </select>
      {valor === "personalizado" && (
        <span className="flex items-center gap-1">
          <input type="date" aria-label="Desde" value={desde} onChange={(e) => onDesde(e.target.value)} className={selectFiltroClass} />
          <span className="text-stone-400 text-xs">a</span>
          <input type="date" aria-label="Hasta" value={hasta} onChange={(e) => onHasta(e.target.value)} className={selectFiltroClass} />
        </span>
      )}
    </>
  );
}
