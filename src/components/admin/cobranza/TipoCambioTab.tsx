"use client";

import { useState } from "react";
import { useToast } from "@/components/admin/Toast";
import type { TipoCambioRow } from "@/lib/cobranza/types";

const inputClass =
  "w-full rounded-lg border border-[#E5E5E5] px-3 py-2 text-sm text-[#1a1a1a] bg-white focus:outline-none focus:ring-2 focus:ring-[#D4B06A]";

function hoyISODate(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatFecha(value: string): string {
  return new Date(value).toLocaleDateString("es-AR", { timeZone: "UTC" });
}

const FUENTE_LABELS: Record<string, string> = {
  oficial: "Oficial",
  blue: "Blue",
  manual: "Manual",
};

export default function TipoCambioTab({
  tiposCambio,
  onSaved,
}: {
  tiposCambio: TipoCambioRow[];
  onSaved: () => void;
}) {
  const { showSuccess, showError } = useToast();
  const [abierto, setAbierto] = useState(false);
  const [fecha, setFecha] = useState(hoyISODate());
  const [usdArs, setUsdArs] = useState("");
  const [fuente, setFuente] = useState("oficial");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function cargar() {
    setError(null);
    const valor = Number(usdArs);
    if (!valor || valor <= 0) {
      setError("La cotización debe ser mayor a 0");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/admin/cobranza/tipo-cambio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fecha, usdArs: valor, fuente }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "No pudimos cargar la cotización.");
        showError(json.error ?? "No pudimos cargar la cotización.");
        return;
      }
      showSuccess("Cotización cargada");
      setAbierto(false);
      setUsdArs("");
      onSaved();
    } catch {
      setError("No pudimos cargar la cotización. Probá de nuevo.");
      showError("No pudimos cargar la cotización. Probá de nuevo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-stone-500 max-w-md">
          El tipo de cambio es referencial, para comparar — el sistema nunca convierte montos
          automáticamente entre USD y ARS.
        </p>
        <button
          type="button"
          onClick={() => setAbierto((v) => !v)}
          className="px-4 py-2 bg-[#D4B06A] hover:bg-[#c19f57] text-[#2F2F2F] font-bold text-sm rounded-lg transition-colors whitespace-nowrap"
        >
          Cargar cotización del día
        </button>
      </div>

      {abierto && (
        <div className="bg-white rounded-2xl border border-[#E5E5E5] p-5 space-y-3">
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label className="block space-y-1">
              <span className="text-xs font-medium text-stone-500">Fecha</span>
              <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className={inputClass} />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-medium text-stone-500">USD → ARS</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={usdArs}
                onChange={(e) => setUsdArs(e.target.value)}
                className={inputClass}
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-medium text-stone-500">Fuente</span>
              <select value={fuente} onChange={(e) => setFuente(e.target.value)} className={inputClass}>
                <option value="oficial">Oficial</option>
                <option value="blue">Blue</option>
                <option value="manual">Manual</option>
              </select>
            </label>
          </div>
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
              onClick={cargar}
              className="px-4 py-2 bg-[#2F2F2F] hover:bg-[#1a1a1a] disabled:opacity-50 text-white font-bold text-sm rounded-lg transition-colors"
            >
              {busy ? "Guardando…" : "Guardar"}
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-[#E5E5E5] overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#E5E5E5] text-left text-stone-500 text-xs uppercase tracking-wide">
              <th className="px-4 py-3 font-medium">Fecha</th>
              <th className="px-4 py-3 font-medium">USD → ARS</th>
              <th className="px-4 py-3 font-medium">Fuente</th>
              <th className="px-4 py-3 font-medium">Cargado por</th>
            </tr>
          </thead>
          <tbody>
            {tiposCambio.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-stone-400">
                  Todavía no hay cotizaciones cargadas.
                </td>
              </tr>
            )}
            {tiposCambio.map((t) => (
              <tr key={t.id} className="border-b border-[#F0F0F0] last:border-0">
                <td className="px-4 py-3 font-medium text-[#2F2F2F]">{formatFecha(t.fecha)}</td>
                <td className="px-4 py-3 text-stone-600">
                  {t.usdArs.toLocaleString("es-AR", { maximumFractionDigits: 2 })}
                </td>
                <td className="px-4 py-3 text-stone-600">{t.fuente ? FUENTE_LABELS[t.fuente] ?? t.fuente : "—"}</td>
                <td className="px-4 py-3 text-stone-500 text-xs">{t.cargadoPor}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
