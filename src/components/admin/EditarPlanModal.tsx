"use client";

import { useState } from "react";
import { useToast } from "@/components/admin/Toast";
import { sumaImportes } from "@/lib/cobranza/calc";
import type { AcuerdoConDetalle } from "@/lib/cobranza/types";

const inputClass =
  "w-full rounded-lg border border-[#E5E5E5] px-3 py-2 text-sm text-[#1a1a1a] bg-white focus:outline-none focus:ring-2 focus:ring-[#D4B06A] disabled:bg-stone-50";
const labelClass = "text-xs font-medium text-stone-500";
const EPSILON = 0.01;

type CuotaEdit = {
  /** undefined = cuota nueva */
  id?: string;
  descripcion: string;
  importe: string;
  vencimiento: string;
  /** Lo ya pagado de esta cuota — si es > 0 no se puede eliminar. */
  pagado: number;
};

function formatMonto(moneda: string, valor: number): string {
  return `${moneda} ${valor.toLocaleString("es-AR", { maximumFractionDigits: 2 })}`;
}

/** Editar un plan de pago existente: total acordado, descripción, y sus
 * cuotas — agregar nuevas, modificar o eliminar las que no tienen pagos.
 * Las cuotas con pagos registrados no se pueden eliminar. */
export default function EditarPlanModal({
  plan,
  onClose,
  onSaved,
}: {
  plan: AcuerdoConDetalle;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { showSuccess, showError } = useToast();
  const [totalAcordado, setTotalAcordado] = useState(String(plan.totalAcordado));
  const [descripcion, setDescripcion] = useState(plan.descripcion ?? "");
  const [cuotas, setCuotas] = useState<CuotaEdit[]>(() =>
    plan.cuotas.map((c) => ({
      id: c.id,
      descripcion: c.descripcion,
      importe: String(c.importe),
      vencimiento: c.vencimiento ? c.vencimiento.slice(0, 10) : "",
      pagado: sumaImportes(plan.movimientos.filter((m) => m.cuotaId === c.id)),
    }))
  );
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function actualizar(idx: number, cambios: Partial<CuotaEdit>) {
    setCuotas((prev) => prev.map((c, i) => (i === idx ? { ...c, ...cambios } : c)));
  }

  function agregarCuota() {
    setCuotas((prev) => [...prev, { descripcion: `Cuota ${prev.length + 1}`, importe: "", vencimiento: "", pagado: 0 }]);
  }

  const totalNum = Number(totalAcordado) || 0;
  const sumaCuotas = cuotas.reduce((acc, c) => acc + (Number(c.importe) || 0), 0);
  const cuotasCoinciden = totalNum > 0 && Math.abs(sumaCuotas - totalNum) < EPSILON;

  function validar(): string | null {
    if (totalNum <= 0) return "El total acordado debe ser mayor a 0";
    if (cuotas.length === 0) return "El plan necesita al menos una cuota";
    if (cuotas.some((c) => !c.descripcion.trim())) return "Cada cuota necesita una descripción";
    if (cuotas.some((c) => !(Number(c.importe) > 0))) return "Cada cuota necesita un importe mayor a 0";
    const debajo = cuotas.find((c) => Number(c.importe) < c.pagado - EPSILON);
    if (debajo) return `El importe de "${debajo.descripcion}" no puede ser menor a lo ya pagado (${formatMonto(plan.moneda, debajo.pagado)})`;
    if (!cuotasCoinciden) {
      return `La suma de las cuotas (${formatMonto(plan.moneda, sumaCuotas)}) debe coincidir con el total acordado (${formatMonto(plan.moneda, totalNum)})`;
    }
    return null;
  }

  async function guardar() {
    const problema = validar();
    setError(problema);
    if (problema) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/cobranza/acuerdos/${plan.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          totalAcordado: totalNum,
          descripcion: descripcion.trim() || null,
          cuotas: cuotas.map((c) => ({
            ...(c.id ? { id: c.id } : {}),
            descripcion: c.descripcion.trim(),
            importe: Number(c.importe),
            vencimiento: c.vencimiento || null,
          })),
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        const mensaje = json.error ?? "No pudimos guardar el plan.";
        setError(mensaje);
        showError(mensaje);
        return;
      }
      showSuccess("Plan de pago actualizado");
      onSaved();
    } catch {
      setError("No pudimos guardar el plan. Probá de nuevo.");
      showError("No pudimos guardar el plan. Probá de nuevo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 w-full max-w-lg bg-white shadow-2xl z-50 overflow-y-auto">
        <div className="p-6 space-y-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sage-500 text-xs font-bold uppercase tracking-widest mb-1">
                {plan.unidadNumero ?? "Sin número"} · {plan.contraparte}
              </p>
              <h2 className="text-xl font-bold text-[#2F2F2F]">Editar plan de pago</h2>
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

          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1">
              <span className={labelClass}>Total acordado ({plan.moneda})</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={totalAcordado}
                onChange={(e) => setTotalAcordado(e.target.value)}
                className={inputClass}
              />
            </label>
            <label className="block space-y-1">
              <span className={labelClass}>Descripción</span>
              <input value={descripcion} onChange={(e) => setDescripcion(e.target.value)} className={inputClass} />
            </label>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-wide text-stone-500">Cuotas</p>
            {cuotas.map((c, idx) => (
              <div key={c.id ?? `nueva-${idx}`} className="bg-[#f5f5f5] rounded-xl p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    aria-label={`Descripción de la cuota ${idx + 1}`}
                    value={c.descripcion}
                    onChange={(e) => actualizar(idx, { descripcion: e.target.value })}
                    className={inputClass}
                  />
                  {c.pagado > EPSILON ? (
                    <span
                      className="flex-shrink-0 px-2 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 whitespace-nowrap"
                      title="Tiene pagos registrados — no se puede eliminar"
                    >
                      Pagado {formatMonto(plan.moneda, c.pagado)}
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setCuotas((prev) => prev.filter((_, i) => i !== idx))}
                      aria-label={`Eliminar cuota ${idx + 1}`}
                      className="text-stone-400 hover:text-red-600 text-lg leading-none px-1"
                    >
                      ×
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    aria-label={`Importe de la cuota ${idx + 1}`}
                    type="number"
                    min="0"
                    step="0.01"
                    value={c.importe}
                    onChange={(e) => actualizar(idx, { importe: e.target.value })}
                    className={inputClass}
                  />
                  <input
                    aria-label={`Vencimiento de la cuota ${idx + 1}`}
                    type="date"
                    value={c.vencimiento}
                    onChange={(e) => actualizar(idx, { vencimiento: e.target.value })}
                    className={inputClass}
                  />
                </div>
              </div>
            ))}
            <button type="button" onClick={agregarCuota} className="text-sm text-sage-600 hover:text-sage-700 font-bold">
              + Agregar cuota
            </button>
            <p className={`text-sm font-medium ${cuotasCoinciden ? "text-emerald-700" : "text-red-600"}`}>
              Suma de cuotas: {formatMonto(plan.moneda, sumaCuotas)}{" "}
              {cuotasCoinciden ? "✓" : `— debe coincidir con ${formatMonto(plan.moneda, totalNum)}`}
            </p>
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-bold text-stone-500 hover:text-stone-700">
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
