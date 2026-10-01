"use client";

import { useState } from "react";
import {
  CONCEPTO_PAGO_OPTIONS,
  CONCEPTO_LABELS,
  DESCRIPCION_SUGERIDA,
  MONEDA_OPTIONS,
  MODALIDAD_OPTIONS,
  MODALIDAD_LABELS,
  type ConceptoPago,
} from "@/lib/cobranza/constantes";
import { vistaPagoProveedor } from "@/lib/cobranza/pagos-proveedor";
import { useToast } from "@/components/admin/Toast";
import SearchableSelect from "@/components/admin/SearchableSelect";
import type { AcuerdoConDetalle, UnidadOpcion } from "@/lib/cobranza/types";

const inputClass =
  "w-full rounded-lg border border-[#E5E5E5] px-3 py-2 text-sm text-[#1a1a1a] bg-white focus:outline-none focus:ring-2 focus:ring-[#D4B06A]";
const labelClass = "text-xs font-medium text-stone-500";

function hoyISODate(): string {
  return new Date().toISOString().slice(0, 10);
}

function esConceptoPago(c: string): c is ConceptoPago {
  return (CONCEPTO_PAGO_OPTIONS as readonly string[]).includes(c);
}

/** Pago directo a proveedor — alta ("Nuevo pago a proveedor") o edición si
 * viene `pago`. No es un plan con cuotas: un pago, con su estado. */
export default function PagoProveedorModal({
  unidades,
  unidadIdInicial,
  pago,
  onClose,
  onSaved,
}: {
  unidades: UnidadOpcion[];
  unidadIdInicial?: string;
  /** Si viene, se edita este pago (acuerdo de tipo "pago"). */
  pago?: AcuerdoConDetalle;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { showSuccess, showError } = useToast();
  const vista = pago ? vistaPagoProveedor(pago, new Date()) : null;

  const [unidadId, setUnidadId] = useState(pago?.unidadId ?? unidadIdInicial ?? "");
  const [proveedor, setProveedor] = useState(pago?.contraparte ?? "");
  const [concepto, setConcepto] = useState<ConceptoPago>(
    pago && esConceptoPago(pago.concepto) ? pago.concepto : "fabrica"
  );
  const [descripcion, setDescripcion] = useState(pago ? (pago.descripcion ?? "") : DESCRIPCION_SUGERIDA.fabrica);
  const [moneda, setMoneda] = useState<"USD" | "ARS">(pago?.moneda === "ARS" ? "ARS" : "USD");
  const [importe, setImporte] = useState(pago ? String(pago.totalAcordado) : "");
  const [fecha, setFecha] = useState(vista?.fecha ? vista.fecha.slice(0, 10) : hoyISODate());
  const [estado, setEstado] = useState<"pagado" | "pendiente">(vista && vista.estado !== "pagado" ? "pendiente" : "pagado");
  const [modalidad, setModalidad] = useState<(typeof MODALIDAD_OPTIONS)[number]>(
    (vista?.modalidad as (typeof MODALIDAD_OPTIONS)[number] | null) ?? "transferencia"
  );
  const [comprobante, setComprobante] = useState<File | null>(null);
  const [notas, setNotas] = useState(pago?.notas ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // La descripción se precompleta con el texto sugerido del concepto, pero
  // solo si el admin no la editó.
  function elegirConcepto(nuevo: ConceptoPago) {
    if (!descripcion.trim() || descripcion === DESCRIPCION_SUGERIDA[concepto]) {
      setDescripcion(DESCRIPCION_SUGERIDA[nuevo]);
    }
    setConcepto(nuevo);
  }

  function validar(): string | null {
    if (!unidadId) return "Elegí una unidad";
    if (!proveedor.trim()) return "Falta el proveedor";
    if (!(Number(importe) > 0)) return "El importe debe ser mayor a 0";
    if (!fecha) return "Falta la fecha del pago";
    return null;
  }

  async function guardar() {
    const problema = validar();
    setError(problema);
    if (problema) return;
    setBusy(true);
    try {
      const form = new FormData();
      if (!pago) form.set("unidadId", unidadId);
      form.set("proveedor", proveedor.trim());
      form.set("concepto", concepto);
      form.set("descripcion", descripcion.trim());
      form.set("moneda", moneda);
      form.set("importe", importe);
      form.set("fecha", fecha);
      form.set("estado", estado);
      form.set("modalidad", modalidad);
      form.set("notas", notas.trim());
      if (estado === "pagado" && comprobante) form.set("comprobante", comprobante);

      const res = await fetch(pago ? `/api/admin/pagos/${pago.id}` : "/api/admin/pagos", {
        method: pago ? "PATCH" : "POST",
        body: form,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        const mensaje = json.error ?? "No pudimos guardar el pago.";
        setError(mensaje);
        showError(mensaje);
        return;
      }
      showSuccess(pago ? "Pago actualizado" : "Pago a proveedor registrado");
      onSaved();
    } catch {
      setError("No pudimos guardar el pago. Probá de nuevo.");
      showError("No pudimos guardar el pago. Probá de nuevo.");
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
              <p className="text-sage-500 text-xs font-bold uppercase tracking-widest mb-1">Pagos</p>
              <h2 className="text-xl font-bold text-[#2F2F2F]">{pago ? "Editar pago a proveedor" : "Nuevo pago a proveedor"}</h2>
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

          {pago ? (
            <p className="text-sm text-stone-500">
              Unidad: <strong className="text-[#2F2F2F]">{pago.unidadNumero ?? "Sin número"}</strong> · {pago.clienteNombre}
            </p>
          ) : (
            <label className="block space-y-1">
              <span className={labelClass}>Unidad</span>
              <SearchableSelect
                value={unidadId}
                onChange={setUnidadId}
                placeholder="Buscar por N° de unidad o cliente..."
                emptyText="Ninguna unidad coincide"
                options={unidades.map((u) => ({ value: u.id, label: `${u.numeroUnidad ?? "Sin número"} — ${u.clienteNombre}` }))}
              />
            </label>
          )}

          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1">
              <span className={labelClass}>Proveedor</span>
              <input value={proveedor} onChange={(e) => setProveedor(e.target.value)} className={inputClass} placeholder="Nombre del proveedor" />
            </label>
            <label className="block space-y-1">
              <span className={labelClass}>Concepto</span>
              <select value={concepto} onChange={(e) => elegirConcepto(e.target.value as ConceptoPago)} className={inputClass}>
                {CONCEPTO_PAGO_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {CONCEPTO_LABELS[c]}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="block space-y-1">
            <span className={labelClass}>Descripción</span>
            <input value={descripcion} onChange={(e) => setDescripcion(e.target.value)} className={inputClass} />
          </label>

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
              <span className={labelClass}>Importe</span>
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
                  <input
                    type="radio"
                    name="estado-pago"
                    value={e}
                    checked={estado === e}
                    onChange={() => setEstado(e)}
                    className="sr-only"
                  />
                  {e === "pagado" ? "Pagado" : "Pendiente"}
                </label>
              ))}
            </div>
          </fieldset>

          {estado === "pagado" && (
            <div className="grid grid-cols-2 gap-3">
              <label className="block space-y-1">
                <span className={labelClass}>Modalidad</span>
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
                <span className={labelClass}>
                  Comprobante {vista?.comprobanteSignedUrl ? "(reemplazar)" : "(opcional)"}
                </span>
                <input
                  type="file"
                  accept="application/pdf,image/*"
                  onChange={(e) => setComprobante(e.target.files?.[0] ?? null)}
                  className="w-full text-sm"
                />
              </label>
            </div>
          )}

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
              {busy ? "Guardando…" : pago ? "Guardar cambios" : "Registrar pago"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
