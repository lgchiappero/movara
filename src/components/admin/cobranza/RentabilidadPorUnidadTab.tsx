"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import { estadoFabricacionOptions, estadoFabricacionLabels, type EstadoFabricacion } from "@/lib/envios/constantes";
import { margenPorcentaje } from "@/lib/cobranza/calc";
import type { AcuerdoConDetalle } from "@/lib/cobranza/types";

function formatUSD(value: number): string {
  return `USD ${value.toLocaleString("es-AR", { maximumFractionDigits: 0 })}`;
}

export default function RentabilidadPorUnidadTab({
  acuerdosCobro,
  acuerdosPago,
  periodo,
}: {
  acuerdosCobro: AcuerdoConDetalle[];
  acuerdosPago: AcuerdoConDetalle[];
  periodo: { desde: string; hasta: string };
}) {
  const router = useRouter();
  const [filtroEstadoUnidad, setFiltroEstadoUnidad] = useState<string>("todos");

  const resumen = useMemo(() => {
    const desde = new Date(periodo.desde).getTime();
    const hasta = new Date(periodo.hasta).getTime();
    const enPeriodo = (fecha: string) => {
      const t = new Date(fecha).getTime();
      return t >= desde && t < hasta;
    };

    const mapa = new Map<
      string,
      {
        unidadId: string;
        unidadNumero: string | null;
        unidadModelo: string | null;
        unidadEstado: string;
        clienteNombre: string;
        cobrado: number;
        pagado: number;
      }
    >();

    for (const a of acuerdosCobro) {
      if (a.moneda !== "USD") continue;
      const entry = mapa.get(a.unidadId) ?? {
        unidadId: a.unidadId,
        unidadNumero: a.unidadNumero,
        unidadModelo: a.unidadModelo,
        unidadEstado: a.unidadEstado,
        clienteNombre: a.clienteNombre,
        cobrado: 0,
        pagado: 0,
      };
      entry.cobrado += a.movimientos.filter((m) => enPeriodo(m.fecha)).reduce((acc, m) => acc + m.importe, 0);
      mapa.set(a.unidadId, entry);
    }
    for (const a of acuerdosPago) {
      if (a.moneda !== "USD") continue;
      const entry = mapa.get(a.unidadId) ?? {
        unidadId: a.unidadId,
        unidadNumero: a.unidadNumero,
        unidadModelo: a.unidadModelo,
        unidadEstado: a.unidadEstado,
        clienteNombre: a.clienteNombre,
        cobrado: 0,
        pagado: 0,
      };
      entry.pagado += a.movimientos.filter((m) => enPeriodo(m.fecha)).reduce((acc, m) => acc + m.importe, 0);
      mapa.set(a.unidadId, entry);
    }

    return Array.from(mapa.values()).map((e) => ({
      ...e,
      margenUSD: e.cobrado - e.pagado,
      margenPct: margenPorcentaje(e.cobrado, e.pagado),
    }));
  }, [acuerdosCobro, acuerdosPago, periodo]);

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
      "Pagado USD": r.pagado,
      "Margen USD": r.margenUSD,
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
              <th className="px-4 py-3 font-medium">Unidad</th>
              <th className="px-4 py-3 font-medium">Cliente</th>
              <th className="px-4 py-3 font-medium">Modelo</th>
              <th className="px-4 py-3 font-medium">Cobrado USD</th>
              <th className="px-4 py-3 font-medium">Pagado USD</th>
              <th className="px-4 py-3 font-medium">Margen USD</th>
              <th className="px-4 py-3 font-medium">Margen %</th>
              <th className="px-4 py-3 font-medium">Estado unidad</th>
            </tr>
          </thead>
          <tbody>
            {filtradas.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-stone-400">
                  No hay acuerdos en USD con movimientos en este período.
                </td>
              </tr>
            )}
            {filtradas.map((r) => (
              <tr
                key={r.unidadId}
                onClick={() => router.push(`/admin/unidades/${r.unidadId}`)}
                className="border-b border-[#F0F0F0] last:border-0 hover:bg-stone-50 cursor-pointer"
              >
                <td className="px-4 py-3 font-medium text-[#2F2F2F]">{r.unidadNumero ?? "Sin número"}</td>
                <td className="px-4 py-3 text-stone-600">{r.clienteNombre}</td>
                <td className="px-4 py-3 text-stone-600">{r.unidadModelo ?? "—"}</td>
                <td className="px-4 py-3 text-stone-600">{formatUSD(r.cobrado)}</td>
                <td className="px-4 py-3 text-stone-600">{formatUSD(r.pagado)}</td>
                <td className={`px-4 py-3 font-medium ${r.margenUSD >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                  {formatUSD(r.margenUSD)}
                </td>
                <td className="px-4 py-3 text-stone-600">
                  {r.margenPct !== null ? `${Math.round(r.margenPct * 10) / 10}%` : "—"}
                </td>
                <td className="px-4 py-3">
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
