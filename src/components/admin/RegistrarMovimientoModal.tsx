"use client";

import { useState } from "react";
import { MODALIDAD_OPTIONS, MODALIDAD_LABELS } from "@/lib/cobranza/constantes";
import { useToast } from "@/components/admin/Toast";
import { cuotasSaldables, etiquetaCuota } from "@/lib/cobranza/cuotas-saldables";
import type { AcuerdoConDetalle } from "@/components/admin/CobranzaPanel";

const inputClass =
  "w-full rounded-lg border border-[#E5E5E5] px-3 py-2 text-sm text-[#1a1a1a] bg-white focus:outline-none focus:ring-2 focus:ring-[#D4B06A]";

function hoyISODate(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function RegistrarMovimientoModal({
  acuerdo,
  onClose,
  onSaved,
}: {
  acuerdo: AcuerdoConDetalle;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { showSuccess, showError } = useToast();
  const [fecha, setFecha] = useState(hoyISODate());
  const [importe, setImporte] = useState("");
  const [cuotaId, setCuotaId] = useState("");
  const [modalidad, setModalidad] = useState<(typeof MODALIDAD_OPTIONS)[number]>("transferencia");
  const [comprobante, setComprobante] = useState<File | null>(null);
  const [notas, setNotas] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const nombreAccion = acuerdo.tipo === "cobro" ? "pago recibido" : "pago realizado";

  const cuotasPendientes = cuotasSaldables(acuerdo.cuotas, acuerdo.movimientos);

  // Precompleta el importe con lo que resta de la cuota (no su importe
  // total, por si ya tenía pagos parciales) — solo si el campo está vacío.
  function elegirCuota(id: string) {
    setCuotaId(id);
    const cuota = cuotasPendientes.find((c) => c.id === id);
    if (cuota && !importe.trim()) setImporte(String(cuota.restante));
  }

  async function registrar() {
    setError(null);
    const total = Number(importe);
    if (!total || total <= 0) {
      setError("El importe debe ser mayor a 0");
      return;
    }
    if (!fecha) {
      setError("Falta la fecha");
      return;
    }
    setBusy(true);
    try {
      const form = new FormData();
      form.set("fecha", fecha);
      form.set("importe", String(total));
      if (cuotaId) form.set("cuotaId", cuotaId);
      form.set("modalidad", modalidad);
      if (notas.trim()) form.set("notas", notas.trim());
      if (comprobante) form.set("comprobante", comprobante);

      const res = await fetch(`/api/admin/cobranza/acuerdos/${acuerdo.id}/movimientos`, {
        method: "POST",
        body: form,
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? `No pudimos registrar el ${nombreAccion}.`);
        showError(json.error ?? `No pudimos registrar el ${nombreAccion}.`);
        return;
      }
      showSuccess(`${acuerdo.tipo === "cobro" ? "Pago recibido" : "Pago realizado"} registrado`);
      onSaved();
    } catch {
      setError(`No pudimos registrar el ${nombreAccion}. Probá de nuevo.`);
      showError(`No pudimos registrar el ${nombreAccion}. Probá de nuevo.`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl z-50 overflow-y-auto">
        <div className="p-6 space-y-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sage-500 text-xs font-bold uppercase tracking-widest mb-1">
                {acuerdo.tipo === "cobro" ? "Registrar pago recibido" : "Registrar pago realizado"}
              </p>
              <h2 className="text-xl font-bold text-[#2F2F2F]">{acuerdo.contraparte}</h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar"
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-stone-100 text-stone-500 text-xl leading-none"
            >
              ×
            </button>
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}

          <label className="block space-y-1">
            <span className="text-xs font-medium text-stone-500">Fecha</span>
            <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className={inputClass} />
          </label>

          <label className="block space-y-1">
            <span className="text-xs font-medium text-stone-500">Importe ({acuerdo.moneda})</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={importe}
              onChange={(e) => setImporte(e.target.value)}
              className={inputClass}
            />
          </label>

          <label className="block space-y-1">
            <span className="text-xs font-medium text-stone-500">Cuota que salda (opcional)</span>
            <select value={cuotaId} onChange={(e) => elegirCuota(e.target.value)} className={inputClass}>
              <option value="">Sin cuota específica</option>
              {cuotasPendientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {etiquetaCuota(c, acuerdo.moneda)}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-1">
            <span className="text-xs font-medium text-stone-500">Modalidad</span>
            <select
              value={modalidad}
              onChange={(e) => setModalidad(e.target.value as (typeof MODALIDAD_OPTIONS)[number])}
              className={inputClass}
            >
              {MODALIDAD_OPTIONS.map((m) => (
                <option key={m} value={m}>
                  {MODALIDAD_LABELS[m]}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-1">
            <span className="text-xs font-medium text-stone-500">Comprobante (opcional)</span>
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.xlsx,.docx"
              onChange={(e) => setComprobante(e.target.files?.[0] ?? null)}
              className="w-full text-sm text-stone-600"
            />
          </label>

          <label className="block space-y-1">
            <span className="text-xs font-medium text-stone-500">Notas</span>
            <textarea value={notas} onChange={(e) => setNotas(e.target.value)} rows={2} className={inputClass} />
          </label>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-bold text-stone-500 hover:text-stone-700"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={registrar}
              className="px-4 py-2 bg-[#D4B06A] hover:bg-[#c19f57] disabled:opacity-50 text-[#2F2F2F] font-bold text-sm rounded-lg transition-colors"
            >
              {busy ? "Registrando…" : acuerdo.tipo === "cobro" ? "Registrar pago recibido" : "Registrar pago realizado"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
