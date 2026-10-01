"use client";

import { useState } from "react";
import {
  CONCEPTO_LOGISTICA_OPTIONS,
  CONCEPTO_LOGISTICA_LABELS,
  MONEDA_OPTIONS,
  type ConceptoLogistica,
} from "@/lib/cobranza/constantes";
import { prorratear, type CostoLogisticaRow } from "@/lib/cobranza/logistica";
import { useToast } from "@/components/admin/Toast";
import SearchableSelect from "@/components/admin/SearchableSelect";

export type EnvioOpcion = { id: string; numeroPI: string | null; numeroContenedor: string | null; cantidadUnidades: number };

const inputClass =
  "w-full rounded-lg border border-[#E5E5E5] px-3 py-2 text-sm text-[#1a1a1a] bg-white focus:outline-none focus:ring-2 focus:ring-[#D4B06A]";
const labelClass = "text-xs font-medium text-stone-500";

function hoyISODate(): string {
  return new Date().toISOString().slice(0, 10);
}

function esConcepto(c: string): c is ConceptoLogistica {
  return (CONCEPTO_LOGISTICA_OPTIONS as readonly string[]).includes(c);
}

export function etiquetaEnvio(e: { numeroPI: string | null; numeroContenedor: string | null }): string {
  return `${e.numeroPI ?? "Sin PI"} · ${e.numeroContenedor ?? "sin contenedor"}`;
}

/** Costo de logística internacional del envío completo (alta o edición).
 * Con "Prorratear" se divide en partes iguales entre las unidades del envío. */
export default function CostoLogisticaModal({
  envios,
  envioIdInicial,
  costo,
  onClose,
  onSaved,
}: {
  envios: EnvioOpcion[];
  envioIdInicial?: string;
  /** Si viene, se edita este costo. */
  costo?: CostoLogisticaRow;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { showSuccess, showError } = useToast();
  const [envioId, setEnvioId] = useState(costo?.envioId ?? envioIdInicial ?? "");
  const [concepto, setConcepto] = useState<ConceptoLogistica>(costo && esConcepto(costo.concepto) ? costo.concepto : "flete");
  const [descripcion, setDescripcion] = useState(costo?.descripcion ?? "");
  const [moneda, setMoneda] = useState<"USD" | "ARS">(costo?.moneda === "ARS" ? "ARS" : "USD");
  const [importe, setImporte] = useState(costo ? String(costo.importe) : "");
  const [fecha, setFecha] = useState(costo ? costo.fecha.slice(0, 10) : hoyISODate());
  const [estado, setEstado] = useState<"pagado" | "pendiente">(costo?.estado === "pendiente" ? "pendiente" : "pagado");
  const [comprobante, setComprobante] = useState<File | null>(null);
  const [notas, setNotas] = useState(costo?.notas ?? "");
  const [prorratearCosto, setProrratearCosto] = useState(costo?.prorrateado ?? false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const envio = envios.find((e) => e.id === envioId);
  const n = envio?.cantidadUnidades ?? 0;
  const partes = prorratear(Number(importe) || 0, Array.from({ length: n }, (_, i) => String(i)));

  function validar(): string | null {
    if (!envioId) return "Elegí un envío";
    if (!(Number(importe) > 0)) return "El importe debe ser mayor a 0";
    if (!fecha) return "Falta la fecha del pago";
    if (prorratearCosto && n === 0) return "El envío no tiene unidades para prorratear el costo";
    return null;
  }

  async function guardar() {
    const problema = validar();
    setError(problema);
    if (problema) return;
    setBusy(true);
    try {
      const form = new FormData();
      if (!costo) form.set("envioId", envioId);
      form.set("concepto", concepto);
      form.set("descripcion", descripcion.trim());
      form.set("moneda", moneda);
      form.set("importe", importe);
      form.set("fecha", fecha);
      form.set("estado", estado);
      form.set("notas", notas.trim());
      form.set("prorratear", String(prorratearCosto));
      if (estado === "pagado" && comprobante) form.set("comprobante", comprobante);

      const res = await fetch(costo ? `/api/admin/logistica/${costo.id}` : "/api/admin/logistica", {
        method: costo ? "PATCH" : "POST",
        body: form,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        const mensaje = json.error ?? "No pudimos guardar el costo.";
        setError(mensaje);
        showError(mensaje);
        return;
      }
      showSuccess(costo ? "Costo actualizado" : "Costo de logística registrado");
      onSaved();
    } catch {
      setError("No pudimos guardar el costo. Probá de nuevo.");
      showError("No pudimos guardar el costo. Probá de nuevo.");
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
              <p className="text-sage-500 text-xs font-bold uppercase tracking-widest mb-1">Logística internacional</p>
              <h2 className="text-xl font-bold text-[#2F2F2F]">{costo ? "Editar costo de logística" : "Nuevo costo de logística"}</h2>
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

          {costo || envioIdInicial ? (
            <p className="text-sm text-stone-500">
              Envío: <strong className="text-[#2F2F2F]">{envio ? etiquetaEnvio(envio) : "—"}</strong>
            </p>
          ) : (
            <label className="block space-y-1">
              <span className={labelClass}>Envío</span>
              <SearchableSelect
                value={envioId}
                onChange={setEnvioId}
                placeholder="Buscar por PI o contenedor..."
                emptyText="Ningún envío coincide"
                options={envios.map((e) => ({
                  value: e.id,
                  label: `${etiquetaEnvio(e)} (${e.cantidadUnidades} unidad${e.cantidadUnidades === 1 ? "" : "es"})`,
                }))}
              />
            </label>
          )}

          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1">
              <span className={labelClass}>Concepto</span>
              <select value={concepto} onChange={(e) => setConcepto(e.target.value as ConceptoLogistica)} className={inputClass}>
                {CONCEPTO_LOGISTICA_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {CONCEPTO_LOGISTICA_LABELS[c]}
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-1">
              <span className={labelClass}>Descripción</span>
              <input value={descripcion} onChange={(e) => setDescripcion(e.target.value)} className={inputClass} placeholder="Opcional" />
            </label>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <label className="block space-y-1">
              <span className={labelClass}>Moneda</span>
              <select value={moneda} onChange={(e) => setMoneda(e.target.value as "USD" | "ARS")} className={inputClass}>
                {MONEDA_OPTIONS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-1">
              <span className={labelClass}>Importe total</span>
              <input type="number" min="0" step="0.01" value={importe} onChange={(e) => setImporte(e.target.value)} className={inputClass} />
            </label>
            <label className="block space-y-1">
              <span className={labelClass}>Fecha de pago</span>
              <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className={inputClass} />
            </label>
          </div>

          <fieldset className="space-y-1">
            <legend className={labelClass}>Estado</legend>
            <div className="flex gap-2">
              {(["pagado", "pendiente"] as const).map((e) => (
                <label
                  key={e}
                  className={`px-4 py-2 rounded-lg text-sm font-bold cursor-pointer transition-colors ${
                    estado === e ? "bg-[#2F2F2F] text-white" : "bg-white border border-[#E5E5E5] text-stone-600"
                  }`}
                >
                  <input type="radio" name="estado-costo" value={e} checked={estado === e} onChange={() => setEstado(e)} className="sr-only" />
                  {e === "pagado" ? "Pagado" : "Pendiente"}
                </label>
              ))}
            </div>
          </fieldset>

          {estado === "pagado" && (
            <label className="block space-y-1">
              <span className={labelClass}>Comprobante {costo?.comprobanteUrl ? "(reemplazar)" : "(opcional)"}</span>
              <input
                type="file"
                accept="application/pdf,image/*"
                onChange={(e) => setComprobante(e.target.files?.[0] ?? null)}
                className="w-full text-sm"
              />
            </label>
          )}

          <label className="flex items-start gap-2 rounded-xl border border-[#E5E5E5] p-3 cursor-pointer">
            <input
              type="checkbox"
              checked={prorratearCosto}
              onChange={(e) => setProrratearCosto(e.target.checked)}
              className="mt-0.5"
            />
            <span className="text-sm">
              <span className="font-medium text-[#2F2F2F]">Prorratear entre unidades del envío</span>
              <span className="block text-xs text-stone-500">
                {envio
                  ? n > 0
                    ? `${moneda} ${(Number(importe) || 0).toLocaleString("es-AR")} ÷ ${n} unidad${n === 1 ? "" : "es"} = ${moneda} ${(partes[0]?.importe ?? 0).toLocaleString("es-AR")} c/u`
                    : "El envío no tiene unidades asignadas."
                  : "Elegí un envío para ver el reparto."}
              </span>
            </span>
          </label>

          <label className="block space-y-1">
            <span className={labelClass}>Notas</span>
            <textarea value={notas} onChange={(e) => setNotas(e.target.value)} rows={2} className={inputClass} />
          </label>

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
              {busy ? "Guardando…" : costo ? "Guardar cambios" : "Registrar costo"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
