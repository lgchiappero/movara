"use client";

import { Fragment, useState } from "react";
import { useToast } from "@/components/admin/Toast";
import ResumenCierre from "@/components/admin/cobranza/ResumenCierre";
import type { CierreRow } from "@/lib/cobranza/types";

const inputClass =
  "w-full rounded-lg border border-[#E5E5E5] px-3 py-2 text-sm text-[#1a1a1a] bg-white focus:outline-none focus:ring-2 focus:ring-[#D4B06A]";

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

function formatMoneda(value: number, moneda: string): string {
  return `${moneda} ${value.toLocaleString("es-AR", { maximumFractionDigits: 0 })}`;
}

/** Mes anterior al actual, en formato {mes, anio} — default razonable para
 * el selector de "Cerrar mes" (el mes actual todavía no terminó). */
function mesAnteriorPorDefecto(): { mes: number; anio: number } {
  const now = new Date();
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return { mes: prev.getMonth() + 1, anio: prev.getFullYear() };
}

export default function CierresTab({
  cierres,
  rol,
  onSaved,
}: {
  cierres: CierreRow[];
  rol: string;
  onSaved: () => void;
}) {
  const { showSuccess, showError } = useToast();
  const [abierto, setAbierto] = useState(false);
  const defecto = mesAnteriorPorDefecto();
  const [mes, setMes] = useState(defecto.mes);
  const [anio, setAnio] = useState(defecto.anio);
  const [notas, setNotas] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [verResumenId, setVerResumenId] = useState<string | null>(null);

  async function cerrarMes() {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/admin/cobranza/cierres", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mes, anio, notas: notas.trim() || undefined }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "No pudimos cerrar el período.");
        showError(json.error ?? "No pudimos cerrar el período.");
        return;
      }
      showSuccess("Período cerrado");
      setAbierto(false);
      setNotas("");
      onSaved();
    } catch {
      setError("No pudimos cerrar el período. Probá de nuevo.");
      showError("No pudimos cerrar el período. Probá de nuevo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        {rol === "admin" && (
          <button
            type="button"
            onClick={() => setAbierto((v) => !v)}
            className="px-4 py-2 bg-[#D4B06A] hover:bg-[#c19f57] text-[#2F2F2F] font-bold text-sm rounded-lg transition-colors"
          >
            Cerrar mes
          </button>
        )}
      </div>

      {abierto && (
        <div className="bg-white rounded-2xl border border-[#E5E5E5] p-5 space-y-3">
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block space-y-1">
              <span className="text-xs font-medium text-stone-500">Mes</span>
              <select value={mes} onChange={(e) => setMes(Number(e.target.value))} className={inputClass}>
                {MESES.map((m, i) => (
                  <option key={m} value={i + 1}>
                    {m}
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-medium text-stone-500">Año</span>
              <input
                type="number"
                value={anio}
                onChange={(e) => setAnio(Number(e.target.value))}
                className={inputClass}
              />
            </label>
          </div>
          <label className="block space-y-1">
            <span className="text-xs font-medium text-stone-500">Notas</span>
            <textarea value={notas} onChange={(e) => setNotas(e.target.value)} rows={2} className={inputClass} />
          </label>
          <p className="text-xs text-stone-400">
            Al cerrar, no se van a poder cargar más movimientos con fecha en {MESES[mes - 1]} de {anio}.
          </p>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setAbierto(false)}
              className="px-4 py-2 text-sm font-bold text-stone-500 hover:text-stone-700"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={cerrarMes}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold text-sm rounded-lg transition-colors"
            >
              {busy ? "Cerrando…" : "Confirmar cierre"}
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-[#E5E5E5] overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#E5E5E5] text-left text-stone-500 text-xs uppercase tracking-wide">
              <th className="px-4 py-3 font-medium">Período</th>
              <th className="px-4 py-3 font-medium">Cobrado USD</th>
              <th className="px-4 py-3 font-medium">Pagado USD</th>
              <th className="px-4 py-3 font-medium">Margen USD</th>
              <th className="px-4 py-3 font-medium">Cerrado por</th>
              <th className="px-4 py-3 font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {cierres.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-stone-400">
                  Todavía no hay períodos cerrados.
                </td>
              </tr>
            )}
            {cierres.map((c) => (
              <Fragment key={c.id}>
                <tr className="border-b border-[#F0F0F0] last:border-0">
                  <td className="px-4 py-3 font-medium text-[#2F2F2F]">
                    {MESES[c.mes - 1]} {c.anio}
                  </td>
                  <td className="px-4 py-3 text-stone-600">{formatMoneda(c.totalCobradoUSD, "USD")}</td>
                  <td className="px-4 py-3 text-stone-600">{formatMoneda(c.totalPagadoUSD, "USD")}</td>
                  <td className={`px-4 py-3 font-medium ${c.margenUSD >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                    {formatMoneda(c.margenUSD, "USD")}
                  </td>
                  <td className="px-4 py-3 text-stone-500 text-xs">{c.cerradoPor}</td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => setVerResumenId(verResumenId === c.id ? null : c.id)}
                      className="text-sage-600 hover:text-sage-700 font-medium text-xs"
                    >
                      {verResumenId === c.id ? "Ocultar" : "Ver resumen"}
                    </button>
                  </td>
                </tr>
                {verResumenId === c.id && (
                  <tr className="bg-[#f5f5f5]">
                    <td colSpan={6} className="px-4 py-4">
                      <ResumenCierre cierre={c} />
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
