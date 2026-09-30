"use client";

import { useState } from "react";
import { MODALIDAD_OPTIONS, MODALIDAD_LABELS } from "@/lib/cobranza/constantes";
import { useToast } from "@/components/admin/Toast";
import type { AcuerdoConDetalle, MovimientoDetalle } from "@/lib/cobranza/types";

const inputClass =
  "w-full rounded-lg border border-[#E5E5E5] px-3 py-2 text-sm text-[#1a1a1a] bg-white focus:outline-none focus:ring-2 focus:ring-[#D4B06A]";

export default function EditarMovimientoModal({
  acuerdo,
  movimiento,
  onClose,
  onSaved,
}: {
  acuerdo: AcuerdoConDetalle;
  movimiento: MovimientoDetalle;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { showSuccess, showError } = useToast();
  const nombreAccion = acuerdo.tipo === "cobro" ? "pago recibido" : "pago realizado";

  const [fecha, setFecha] = useState(movimiento.fecha.slice(0, 10));
  const [importe, setImporte] = useState(String(movimiento.importe));
  const [cuotaId, setCuotaId] = useState(movimiento.cuotaId ?? "");
  const [modalidad, setModalidad] = useState<(typeof MODALIDAD_OPTIONS)[number]>(
    movimiento.modalidad as (typeof MODALIDAD_OPTIONS)[number]
  );
  const [comprobante, setComprobante] = useState<File | null>(null);
  const [notas, setNotas] = useState(movimiento.notas ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Además de la cuota actual del pago (aunque ya esté "pagada" gracias a
  // este mismo pago), se pueden elegir las que todavía están pendientes.
  const cuotasSeleccionables = acuerdo.cuotas.filter(
    (c) => c.estado !== "pagado" || c.id === movimiento.cuotaId
  );

  async function guardar() {
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

      const res = await fetch(`/api/admin/cobranza/acuerdos/${acuerdo.id}/movimientos/${movimiento.id}`, {
        method: "PATCH",
        body: form,
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? `No pudimos guardar el ${nombreAccion}.`);
        showError(json.error ?? `No pudimos guardar el ${nombreAccion}.`);
        return;
      }
      showSuccess("Guardado");
      onSaved();
    } catch {
      setError(`No pudimos guardar el ${nombreAccion}. Probá de nuevo.`);
      showError(`No pudimos guardar el ${nombreAccion}. Probá de nuevo.`);
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
                Editar {nombreAccion}
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
            <select value={cuotaId} onChange={(e) => setCuotaId(e.target.value)} className={inputClass}>
              <option value="">Pago parcial / sin cuota asociada</option>
              {cuotasSeleccionables.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.descripcion} — {acuerdo.moneda} {c.importe.toLocaleString("es-AR")}
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
            <span className="text-xs font-medium text-stone-500">
              Comprobante {movimiento.comprobanteUrl ? "(reemplazar)" : "(opcional)"}
            </span>
            {movimiento.comprobanteSignedUrl && !comprobante && (
              <a
                href={movimiento.comprobanteSignedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-xs text-sage-600 hover:text-sage-700 font-medium mb-1"
              >
                Ver comprobante actual
              </a>
            )}
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
              onClick={guardar}
              className="px-4 py-2 bg-[#D4B06A] hover:bg-[#c19f57] disabled:opacity-50 text-[#2F2F2F] font-bold text-sm rounded-lg transition-colors"
            >
              {busy ? "Guardando…" : "Guardar cambios"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
