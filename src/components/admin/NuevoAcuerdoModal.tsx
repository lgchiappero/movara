"use client";

import { useState } from "react";
import {
  TIPO_ACUERDO_LABELS,
  CONCEPTO_COBRO_OPTIONS,
  CONCEPTO_PAGO_OPTIONS,
  CONCEPTO_LABELS,
  MONEDA_OPTIONS,
  type TipoAcuerdo,
} from "@/lib/cobranza/constantes";
import { useToast } from "@/components/admin/Toast";
import type { UnidadOpcion } from "@/components/admin/CobranzaPanel";

const inputClass =
  "w-full rounded-lg border border-[#E5E5E5] px-3 py-2 text-sm text-[#1a1a1a] bg-white focus:outline-none focus:ring-2 focus:ring-[#D4B06A]";

type CuotaForm = { descripcion: string; importe: string; vencimiento: string };

export default function NuevoAcuerdoModal({
  tipo: tipoInicial,
  unidades,
  unidadIdInicial,
  onClose,
  onCreated,
}: {
  tipo: "cobro" | "pago";
  unidades: UnidadOpcion[];
  unidadIdInicial?: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const { showSuccess, showError } = useToast();
  const [step, setStep] = useState<1 | 2>(1);
  const [tipo, setTipo] = useState<TipoAcuerdo>(tipoInicial);
  const [unidadId, setUnidadId] = useState(unidadIdInicial ?? "");
  const [contraparte, setContraparte] = useState("");
  const [concepto, setConcepto] = useState<string>(tipoInicial === "cobro" ? "venta" : "fabrica");
  const [descripcion, setDescripcion] = useState("");
  const [moneda, setMoneda] = useState<"USD" | "ARS">("USD");
  const [totalAcordado, setTotalAcordado] = useState("");
  const [notas, setNotas] = useState("");
  const [cuotas, setCuotas] = useState<CuotaForm[]>([{ descripcion: "Pago único", importe: "", vencimiento: "" }]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const conceptoOptions = tipo === "cobro" ? CONCEPTO_COBRO_OPTIONS : CONCEPTO_PAGO_OPTIONS;

  function cambiarTipo(nuevo: TipoAcuerdo) {
    setTipo(nuevo);
    const opciones = nuevo === "cobro" ? CONCEPTO_COBRO_OPTIONS : CONCEPTO_PAGO_OPTIONS;
    if (!(opciones as readonly string[]).includes(concepto)) {
      setConcepto(opciones[0]);
    }
  }

  function irAPaso2() {
    setError(null);
    if (!unidadId) return setError("Elegí una unidad");
    if (!contraparte.trim()) return setError(`Falta ${tipo === "cobro" ? "el cliente" : "el proveedor"}`);
    const total = Number(totalAcordado);
    if (!total || total <= 0) return setError("El total acordado debe ser mayor a 0");
    // Si sigue habiendo una sola cuota sin editar ("pago único" con importe
    // vacío), la pre-completamos con el total para no obligar a retipearlo.
    if (cuotas.length === 1 && !cuotas[0].importe.trim()) {
      setCuotas([{ ...cuotas[0], importe: totalAcordado }]);
    }
    setStep(2);
  }

  function agregarCuota() {
    setCuotas((prev) => [...prev, { descripcion: `Cuota ${prev.length + 1}`, importe: "", vencimiento: "" }]);
  }

  function quitarCuota(idx: number) {
    setCuotas((prev) => prev.filter((_, i) => i !== idx));
  }

  function actualizarCuota(idx: number, campo: keyof CuotaForm, valor: string) {
    setCuotas((prev) => prev.map((c, i) => (i === idx ? { ...c, [campo]: valor } : c)));
  }

  const sumaCuotas = cuotas.reduce((acc, c) => acc + (Number(c.importe) || 0), 0);
  const totalNum = Number(totalAcordado) || 0;
  const cuotasCoinciden = Math.abs(sumaCuotas - totalNum) < 0.01;

  async function crear() {
    setError(null);
    if (!cuotasCoinciden) {
      setError(`La suma de las cuotas (${sumaCuotas}) debe coincidir con el total acordado (${totalNum})`);
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/admin/cobranza/acuerdos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo,
          unidadId,
          contraparte: contraparte.trim(),
          concepto,
          descripcion: descripcion.trim() || null,
          moneda,
          totalAcordado: totalNum,
          notas: notas.trim() || null,
          cuotas: cuotas.map((c) => ({
            descripcion: c.descripcion.trim() || "Cuota",
            importe: Number(c.importe) || 0,
            vencimiento: c.vencimiento || null,
          })),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "No pudimos crear el acuerdo.");
        showError(json.error ?? "No pudimos crear el acuerdo.");
        return;
      }
      showSuccess("Acuerdo creado");
      onCreated();
    } catch {
      setError("No pudimos crear el acuerdo. Probá de nuevo.");
      showError("No pudimos crear el acuerdo. Probá de nuevo.");
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
                Nuevo acuerdo — Paso {step} de 2
              </p>
              <h2 className="text-xl font-bold text-[#2F2F2F]">
                {step === 1 ? "Datos del acuerdo" : "Cuotas"}
              </h2>
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

          {step === 1 ? (
            <div className="space-y-4">
              <label className="block space-y-1">
                <span className="text-xs font-medium text-stone-500">Tipo</span>
                <div className="flex gap-2">
                  {(["cobro", "pago"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => cambiarTipo(t)}
                      className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
                        tipo === t ? "bg-[#2F2F2F] text-white" : "bg-white border border-[#E5E5E5] text-stone-600"
                      }`}
                    >
                      {TIPO_ACUERDO_LABELS[t]}
                    </button>
                  ))}
                </div>
              </label>

              <label className="block space-y-1">
                <span className="text-xs font-medium text-stone-500">Unidad</span>
                <select value={unidadId} onChange={(e) => setUnidadId(e.target.value)} className={inputClass}>
                  <option value="">Elegir unidad…</option>
                  {unidades.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.numeroUnidad ?? "Sin número"} — {u.clienteNombre}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block space-y-1">
                <span className="text-xs font-medium text-stone-500">
                  {tipo === "cobro" ? "Cliente" : "Proveedor"}
                </span>
                <input
                  value={contraparte}
                  onChange={(e) => setContraparte(e.target.value)}
                  className={inputClass}
                  placeholder={tipo === "cobro" ? "Nombre del cliente" : "Nombre del proveedor"}
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="block space-y-1">
                  <span className="text-xs font-medium text-stone-500">Concepto</span>
                  <select value={concepto} onChange={(e) => setConcepto(e.target.value)} className={inputClass}>
                    {conceptoOptions.map((c) => (
                      <option key={c} value={c}>
                        {CONCEPTO_LABELS[c]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block space-y-1">
                  <span className="text-xs font-medium text-stone-500">Moneda</span>
                  <select
                    value={moneda}
                    onChange={(e) => setMoneda(e.target.value as "USD" | "ARS")}
                    className={inputClass}
                  >
                    {MONEDA_OPTIONS.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="block space-y-1">
                <span className="text-xs font-medium text-stone-500">Descripción</span>
                <input
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  className={inputClass}
                  placeholder="Opcional"
                />
              </label>

              <label className="block space-y-1">
                <span className="text-xs font-medium text-stone-500">Total acordado ({moneda})</span>
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
                <span className="text-xs font-medium text-stone-500">Notas</span>
                <textarea
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  rows={2}
                  className={inputClass}
                />
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
                  onClick={irAPaso2}
                  className="px-4 py-2 bg-[#2F2F2F] hover:bg-[#1a1a1a] text-white font-bold text-sm rounded-lg transition-colors"
                >
                  Continuar →
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-stone-500">
                Total acordado: <strong className="text-[#2F2F2F]">{moneda} {totalNum.toLocaleString("es-AR")}</strong>
              </p>

              <div className="space-y-3">
                {cuotas.map((c, idx) => (
                  <div key={idx} className="bg-[#f5f5f5] rounded-xl p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <input
                        value={c.descripcion}
                        onChange={(e) => actualizarCuota(idx, "descripcion", e.target.value)}
                        className={inputClass}
                        placeholder="Descripción de la cuota"
                      />
                      {cuotas.length > 1 && (
                        <button
                          type="button"
                          onClick={() => quitarCuota(idx)}
                          aria-label="Quitar cuota"
                          className="text-stone-400 hover:text-red-600 text-lg leading-none px-1"
                        >
                          ×
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={c.importe}
                        onChange={(e) => actualizarCuota(idx, "importe", e.target.value)}
                        className={inputClass}
                        placeholder="Importe"
                      />
                      <input
                        type="date"
                        value={c.vencimiento}
                        onChange={(e) => actualizarCuota(idx, "vencimiento", e.target.value)}
                        className={inputClass}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={agregarCuota}
                className="text-sm text-sage-600 hover:text-sage-700 font-bold"
              >
                + Agregar cuota
              </button>

              <p className={`text-sm font-medium ${cuotasCoinciden ? "text-emerald-700" : "text-red-600"}`}>
                Suma de cuotas: {moneda} {sumaCuotas.toLocaleString("es-AR")}{" "}
                {cuotasCoinciden ? "✓" : `— debe coincidir con ${moneda} ${totalNum.toLocaleString("es-AR")}`}
              </p>

              <div className="flex justify-between gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-4 py-2 text-sm font-bold text-stone-500 hover:text-stone-700"
                >
                  ← Volver
                </button>
                <button
                  type="button"
                  disabled={busy || !cuotasCoinciden}
                  onClick={crear}
                  className="px-4 py-2 bg-[#D4B06A] hover:bg-[#c19f57] disabled:opacity-50 text-[#2F2F2F] font-bold text-sm rounded-lg transition-colors"
                >
                  {busy ? "Creando…" : "Crear acuerdo"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
