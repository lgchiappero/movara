"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import { estadoFabricacionOptions, estadoFabricacionLabels, type EstadoFabricacion } from "@/lib/envios/constantes";
import { rentabilidadPorUnidad, type ProrrateoUSD } from "@/lib/cobranza/rentabilidad";
import type { AcuerdoConDetalle } from "@/lib/cobranza/types";

function formatUSD(value: number): string {
  return `USD ${value.toLocaleString("es-AR", { maximumFractionDigits: 0 })}`;
}

/** Margen real por unidad: cobrado − fábrica − logística nacional − parte
 * de la logística internacional (si está prorrateada). */
export default function RentabilidadPorUnidadTab({
  acuerdosCobro,
  acuerdosPago,
  prorrateos = [],
  periodo,
}: {
  acuerdosCobro: AcuerdoConDetalle[];
  acuerdosPago: AcuerdoConDetalle[];
  prorrateos?: ProrrateoUSD[];
  periodo: { desde: string; hasta: string };
}) {
  const router = useRouter();
  const [filtroEstadoUnidad, setFiltroEstadoUnidad] = useState<string>("todos");

  const resumen = useMemo(
    () => rentabilidadPorUnidad(acuerdosCobro, acuerdosPago, prorrateos, periodo),
    [acuerdosCobro, acuerdosPago, prorrateos, periodo]
  );

  const filtradas = useMemo(
    () => (filtroEstadoUnidad === "todos" ? resumen : resumen.filter((r) => r.unidadEstado === filtroEstadoUnidad)),
    [resumen, filtroEstadoUnidad]
  );

  function exportarExcel() {
    const rows = filtradas.map((r) => ({
      Unidad: r.unidadNumero ?? "Sin número",
      Cliente: r.clienteNombre,
      Modelo: r.unidadModelo ?? "—",
      "Cobrado USD": r.cobrado,
      "Fábrica USD": r.fabrica,
      "Logística nacional USD": r.logisticaNacional,
      "Logística internacional USD": r.logisticaInternacional,
      "Margen real USD": r.margenUSD,
      "Margen %": r.margenPct !== null ? Math.round(r.margenPct * 10) / 10 : "",
      "Estado unidad": estadoFabricacionLabels[r.unidadEstado as EstadoFabricacion] ?? r.unidadEstado,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Rentabilidad");
    XLSX.writeFile(wb, "cobranza-rentabilidad-por-unidad.xlsx");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <select
          value={filtroEstadoUnidad}
          onChange={(e) => setFiltroEstadoUnidad(e.target.value)}
          className="rounded-lg border border-[#E5E5E5] px-3 py-2 text-sm text-[#2F2F2F] bg-white"
        >
          <option value="todos">Todos los estados de unidad</option>
          {estadoFabricacionOptions.map((e) => (
            <option key={e} value={e}>
              {estadoFabricacionLabels[e]}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={exportarExcel}
          className="px-4 py-2 bg-white border border-[#E5E5E5] hover:border-stone-300 text-[#2F2F2F] font-bold text-sm rounded-lg transition-colors"
        >
          Exportar Excel
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-[#E5E5E5] overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#E5E5E5] text-left text-stone-500 text-xs uppercase tracking-wide">
              <th className="px-3 py-3 font-medium">Unidad</th>
              <th className="px-3 py-3 font-medium">Cliente</th>
              <th className="px-3 py-3 font-medium text-right">Cobrado</th>
              <th className="px-3 py-3 font-medium text-right">− Fábrica</th>
              <th className="px-3 py-3 font-medium text-right">− Log. nacional</th>
              <th className="px-3 py-3 font-medium text-right">− Log. internacional</th>
              <th className="px-3 py-3 font-medium text-right">= Margen real USD</th>
              <th className="px-3 py-3 font-medium text-right">Margen %</th>
              <th className="px-3 py-3 font-medium">Estado unidad</th>
            </tr>
          </thead>
          <tbody>
            {filtradas.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-stone-400">
                  No hay cobros ni pagos en USD en este período.
                </td>
              </tr>
            )}
            {filtradas.map((r) => (
              <tr
                key={r.unidadId}
                onClick={() => router.push(`/admin/unidades/${r.unidadId}`)}
                className="border-b border-[#F0F0F0] last:border-0 hover:bg-stone-50 cursor-pointer"
              >
                <td className="px-3 py-3 font-medium text-[#2F2F2F] whitespace-nowrap">
                  {r.unidadNumero ?? "Sin número"}
                  {r.unidadModelo && <span className="block text-xs text-stone-400">{r.unidadModelo}</span>}
                </td>
                <td className="px-3 py-3 text-stone-600">{r.clienteNombre}</td>
                <td className="px-3 py-3 text-right whitespace-nowrap text-stone-700">{formatUSD(r.cobrado)}</td>
                <td className="px-3 py-3 text-right whitespace-nowrap text-stone-600">{formatUSD(r.fabrica)}</td>
                <td className="px-3 py-3 text-right whitespace-nowrap text-stone-600">{formatUSD(r.logisticaNacional)}</td>
                <td className="px-3 py-3 text-right whitespace-nowrap text-stone-600">{formatUSD(r.logisticaInternacional)}</td>
                <td className={`px-3 py-3 text-right whitespace-nowrap font-bold ${r.margenUSD >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                  {formatUSD(r.margenUSD)}
                </td>
                <td className="px-3 py-3 text-right text-stone-600">
                  {r.margenPct !== null ? `${Math.round(r.margenPct * 10) / 10}%` : "—"}
                </td>
                <td className="px-3 py-3">
                  <span className="px-2 py-1 rounded-full text-xs font-bold bg-stone-100 text-stone-600">
                    {estadoFabricacionLabels[r.unidadEstado as EstadoFabricacion] ?? r.unidadEstado}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
