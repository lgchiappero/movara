"use client";

import { useEffect, useRef, useState } from "react";
import {
  MONEDA_OPTIONS,
  CONCEPTO_PAGO_UNIDAD_OPTIONS,
  CONCEPTO_LABELS,
  DESCRIPCION_SUGERIDA,
  type ConceptoPagoUnidad,
  type TipoAcuerdo,
} from "@/lib/cobranza/constantes";
import {
  TIPO_CUOTA_OPTIONS,
  TIPO_CUOTA_LABELS,
  renumerarCuotas,
  nuevaCuota,
  cambiarTipoCuota,
  cuotasDesdePreset,
  importesPorPorcentaje,
  PRESET_FABRICA,
  PRESET_PAGO_UNICO,
  type CuotaPlanForm,
  type TipoCuotaPlan,
} from "@/lib/cobranza/cuotas-plan";
import { resumenPlan } from "@/lib/cobranza/planes-unidad";
import { useToast } from "@/components/admin/Toast";
import SearchableSelect from "@/components/admin/SearchableSelect";
import type { UnidadOpcion } from "@/lib/cobranza/types";

const inputClass =
  "w-full rounded-lg border border-[#E5E5E5] px-3 py-2 text-sm text-[#1a1a1a] bg-white focus:outline-none focus:ring-2 focus:ring-[#D4B06A]";
const labelClass = "text-xs font-medium text-stone-500";

// Tolerancia para comparar la suma de cuotas con el total — misma que el
// validador del servidor.
const EPSILON = 0.01;

/** Cliente y precio acordado de una unidad, o null si no se pudieron obtener
 * (en ese caso el usuario carga los campos a mano). */
async function fetchDatosUnidad(
  id: string
): Promise<{ clienteNombre: string | null; precioCliente: number | null } | null> {
  try {
    const res = await fetch(`/api/admin/unidades/${id}`);
    if (!res.ok) return null;
    const json = await res.json();
    return {
      clienteNombre: json.unidad?.cliente?.nombre ?? null,
      precioCliente: json.unidad?.precioCliente ?? null,
    };
  } catch {
    return null;
  }
}

function formatMonto(moneda: string, valor: number): string {
  return `${moneda} ${valor.toLocaleString("es-AR", { maximumFractionDigits: 2 })}`;
}

/** Alta de un plan de pago de una unidad:
 * - cobro (Cobranza): cómo va a pagar el cliente la unidad completa — uno
 *   solo por unidad; cliente y total se autocompletan desde la unidad.
 * - pago (Pagos → Por unidad): lo que se le paga a un proveedor por esa
 *   unidad (fábrica o logística nacional) — puede haber varios. La fábrica
 *   arranca con 50% + 50%, la logística con un pago único. */
export default function NuevoPlanPagoModal({
  tipo = "cobro",
  unidades,
  unidadIdInicial,
  onClose,
  onCreated,
}: {
  tipo?: TipoAcuerdo;
  unidades: UnidadOpcion[];
  unidadIdInicial?: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const esCobro = tipo === "cobro";
  const { showSuccess, showError } = useToast();

  const unidadInicialConPlan = esCobro && unidades.find((u) => u.id === unidadIdInicial)?.tienePlanCobro === true;
  const [unidadId, setUnidadId] = useState(unidadInicialConPlan ? "" : (unidadIdInicial ?? ""));
  const [contraparte, setContraparte] = useState("");
  const [concepto, setConcepto] = useState<ConceptoPagoUnidad>("fabrica");
  const [descripcion, setDescripcion] = useState(esCobro ? "" : DESCRIPCION_SUGERIDA.fabrica);
  const [moneda, setMoneda] = useState<"USD" | "ARS">("USD");
  const [totalAcordado, setTotalAcordado] = useState("");
  const [notas, setNotas] = useState("");
  const [cuotas, setCuotas] = useState<CuotaPlanForm[]>(() =>
    esCobro ? renumerarCuotas([nuevaCuota("anticipo")]) : cuotasDesdePreset(PRESET_FABRICA, 0)
  );
  // Mientras no se editen a mano, los importes de una plantilla (50%+50%,
  // pago único) siguen al total acordado.
  const [porcentajes, setPorcentajes] = useState<number[] | null>(() =>
    esCobro ? null : PRESET_FABRICA.map((p) => p.porcentaje)
  );
  const [error, setError] = useState<string | null>(
    unidadInicialConPlan ? "Esta unidad ya tiene un plan de pago. Registrá los pagos sobre ese plan." : null
  );
  const [busy, setBusy] = useState(false);

  // Cobranza: solo una unidad sin plan puede recibir un plan nuevo.
  const unidadesElegibles = esCobro ? unidades.filter((u) => !u.tienePlanCobro) : unidades;

  // ── Autocompletado desde la unidad ────────────────────────────────────
  // Id de la última unidad pedida — si el usuario cambia de unidad antes de
  // que llegue la respuesta anterior, esa respuesta se descarta.
  const ultimaUnidadPedida = useRef<string | null>(null);

  function autocompletarDesdeUnidad(id: string) {
    ultimaUnidadPedida.current = id;
    if (!esCobro || !id) return;
    void fetchDatosUnidad(id).then((datos) => {
      if (!datos || ultimaUnidadPedida.current !== id) return;
      if (datos.clienteNombre) setContraparte(datos.clienteNombre);
      if (datos.precioCliente != null) setTotalAcordado(String(datos.precioCliente));
    });
  }

  function elegirUnidad(id: string) {
    setUnidadId(id);
    autocompletarDesdeUnidad(id);
  }

  // Unidad preseleccionada al abrir (ej: desde la ficha de la unidad).
  useEffect(() => {
    if (unidadIdInicial && !unidadInicialConPlan) autocompletarDesdeUnidad(unidadIdInicial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Concepto (solo pagos) ─────────────────────────────────────────────
  // Cambia la descripción sugerida (si no se editó) y la plantilla de
  // cuotas: fábrica 50%+50%, el resto pago único.
  function elegirConcepto(nuevo: ConceptoPagoUnidad) {
    if (!descripcion.trim() || descripcion === DESCRIPCION_SUGERIDA[concepto]) {
      setDescripcion(DESCRIPCION_SUGERIDA[nuevo]);
    }
    setConcepto(nuevo);
    const preset = nuevo === "fabrica" ? PRESET_FABRICA : PRESET_PAGO_UNICO;
    setCuotas(cuotasDesdePreset(preset, Number(totalAcordado) || 0));
    setPorcentajes(preset.map((p) => p.porcentaje));
  }

  function cambiarTotal(valor: string) {
    setTotalAcordado(valor);
    if (porcentajes) {
      const importes = importesPorPorcentaje(Number(valor) || 0, porcentajes);
      setCuotas((prev) => prev.map((c, i) => ({ ...c, importe: importes[i] ?? c.importe })));
    }
  }

  // ── Cuotas ─────────────────────────────────────────────────────────────
  // Cualquier cambio manual a las cuotas suelta la plantilla de porcentajes.
  function actualizarCuotas(fn: (prev: CuotaPlanForm[]) => CuotaPlanForm[]) {
    setPorcentajes(null);
    setCuotas((prev) => renumerarCuotas(fn(prev)));
  }

  function actualizarCuota(idx: number, cambios: Partial<CuotaPlanForm>) {
    actualizarCuotas((prev) => prev.map((c, i) => (i === idx ? { ...c, ...cambios } : c)));
  }

  function agregarCuota() {
    // Lo más común después del anticipo son cuotas — se sugiere ese tipo.
    actualizarCuotas((prev) => [...prev, nuevaCuota("cuota")]);
  }

  const totalNum = Number(totalAcordado) || 0;
  const sumaCuotas = cuotas.reduce((acc, c) => acc + (Number(c.importe) || 0), 0);
  const cuotasCoinciden = totalNum > 0 && Math.abs(sumaCuotas - totalNum) < EPSILON;
  const resumen = resumenPlan(cuotas.map((c) => c.descripcion));

  function validar(): string | null {
    if (!unidadId) return "Elegí una unidad";
    if (!contraparte.trim()) return esCobro ? "Falta el cliente" : "Falta el proveedor";
    if (totalNum <= 0) return "El total acordado debe ser mayor a 0";
    if (cuotas.length === 0) return "Agregá al menos una cuota";
    if (cuotas.some((c) => !c.descripcion.trim())) return "Cada cuota necesita una descripción";
    if (cuotas.some((c) => !(Number(c.importe) > 0))) return "Cada cuota necesita un importe mayor a 0";
    if (!cuotasCoinciden) {
      return `La suma de las cuotas (${formatMonto(moneda, sumaCuotas)}) debe coincidir con el total acordado (${formatMonto(moneda, totalNum)})`;
    }
    return null;
  }

  async function crear() {
    const problema = validar();
    setError(problema);
    if (problema) return;
    setBusy(true);
    try {
      const res = await fetch("/api/admin/cobranza/acuerdos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo,
          unidadId,
          contraparte: contraparte.trim(),
          concepto: esCobro ? "venta" : concepto,
          descripcion: descripcion.trim() || null,
          moneda,
          totalAcordado: totalNum,
          notas: notas.trim() || null,
          cuotas: cuotas.map((c) => ({
            descripcion: c.descripcion.trim(),
            importe: Number(c.importe),
            vencimiento: c.vencimiento || null,
          })),
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        const mensaje = json.error ?? "No pudimos crear el plan de pago.";
        setError(mensaje);
        showError(mensaje);
        return;
      }
      showSuccess(esCobro ? "Plan de pago creado" : "Pago a proveedor creado");
      onCreated();
    } catch {
      setError("No pudimos crear el plan de pago. Probá de nuevo.");
      showError("No pudimos crear el plan de pago. Probá de nuevo.");
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
                {esCobro ? "Cobranza" : "Pagos"}
              </p>
              <h2 className="text-xl font-bold text-[#2F2F2F]">{esCobro ? "Nuevo plan de pago" : "Nuevo pago a proveedor"}</h2>
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

          <label className="block space-y-1">
            <span className={labelClass}>Unidad</span>
            <SearchableSelect
              value={unidadId}
              onChange={elegirUnidad}
              placeholder="Buscar por N° de unidad o cliente..."
              emptyText={esCobro ? "Ninguna unidad sin plan coincide" : "Ninguna unidad coincide"}
              options={unidadesElegibles.map((u) => ({
                value: u.id,
                label: `${u.numeroUnidad ?? "Sin número"} — ${u.clienteNombre}`,
              }))}
            />
          </label>

          <label className="block space-y-1">
            <span className={labelClass}>{esCobro ? "Cliente" : "Proveedor"}</span>
            <input
              value={contraparte}
              onChange={(e) => setContraparte(e.target.value)}
              className={inputClass}
              placeholder={esCobro ? "Nombre del cliente" : "Ej: Heshi, transportista"}
            />
          </label>

          {!esCobro && (
            <label className="block space-y-1">
              <span className={labelClass}>Concepto</span>
              <select
                value={concepto}
                onChange={(e) => elegirConcepto(e.target.value as ConceptoPagoUnidad)}
                className={inputClass}
              >
                {CONCEPTO_PAGO_UNIDAD_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {CONCEPTO_LABELS[c]}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label className="block space-y-1">
            <span className={labelClass}>Descripción</span>
            <input
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              className={inputClass}
              placeholder={esCobro ? "Opcional — ej: Venta Flex 38, financiado en 3 cuotas" : "Opcional"}
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1">
              <span className={labelClass}>Moneda</span>
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
            <label className="block space-y-1">
              <span className={labelClass}>Total acordado ({moneda})</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={totalAcordado}
                onChange={(e) => cambiarTotal(e.target.value)}
                className={inputClass}
              />
            </label>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-wide text-stone-500">Cuotas</p>
            {cuotas.map((c, idx) => (
              <div key={idx} className="bg-[#f5f5f5] rounded-xl p-3 space-y-2" data-testid="cuota-plan">
                <div className="flex items-center gap-2">
                  <select
                    aria-label={`Tipo de la cuota ${idx + 1}`}
                    value={c.tipo}
                    onChange={(e) =>
                      actualizarCuotas((prev) =>
                        prev.map((x, i) => (i === idx ? cambiarTipoCuota(x, e.target.value as TipoCuotaPlan) : x))
                      )
                    }
                    className={`${inputClass} w-32 flex-shrink-0`}
                  >
                    {TIPO_CUOTA_OPTIONS.map((t) => (
                      <option key={t} value={t}>
                        {TIPO_CUOTA_LABELS[t]}
                      </option>
                    ))}
                  </select>
                  <input
                    aria-label={`Descripción de la cuota ${idx + 1}`}
                    value={c.descripcion}
                    onChange={(e) => actualizarCuota(idx, { descripcion: e.target.value, editada: true })}
                    className={inputClass}
                    placeholder="Descripción de la cuota"
                  />
                  {cuotas.length > 1 && (
                    <button
                      type="button"
                      onClick={() => actualizarCuotas((prev) => prev.filter((_, i) => i !== idx))}
                      aria-label={`Quitar cuota ${idx + 1}`}
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
                    onChange={(e) => actualizarCuota(idx, { importe: e.target.value })}
                    className={inputClass}
                    placeholder="Importe"
                  />
                  <input
                    aria-label={`Vencimiento de la cuota ${idx + 1}`}
                    type="date"
                    value={c.vencimiento}
                    onChange={(e) => actualizarCuota(idx, { vencimiento: e.target.value })}
                    className={inputClass}
                  />
                </div>
              </div>
            ))}
            <button type="button" onClick={agregarCuota} className="text-sm text-sage-600 hover:text-sage-700 font-bold">
              + Agregar cuota
            </button>
            <p className={`text-sm font-medium ${cuotasCoinciden ? "text-emerald-700" : "text-red-600"}`}>
              Suma de cuotas: {formatMonto(moneda, sumaCuotas)}{" "}
              {cuotasCoinciden ? "✓" : `— debe coincidir con ${formatMonto(moneda, totalNum)}`}
            </p>
          </div>

          <label className="block space-y-1">
            <span className={labelClass}>Notas</span>
            <textarea value={notas} onChange={(e) => setNotas(e.target.value)} rows={2} className={inputClass} />
          </label>

          {/* Confirmación — lo que se va a guardar, descripción incluida. */}
          <div className="rounded-xl border border-[#E5E5E5] p-3 text-sm space-y-1" aria-label="Resumen del plan">
            <p className="text-xs font-bold uppercase tracking-wide text-stone-500">Resumen</p>
            {descripcion.trim() && <p className="font-medium text-[#2F2F2F]">{descripcion.trim()}</p>}
            <p className="text-stone-600">
              {!esCobro && contraparte.trim() ? `${contraparte.trim()} · ${CONCEPTO_LABELS[concepto]} · ` : ""}
              {resumen || "Sin cuotas"} · Total {formatMonto(moneda, totalNum)}
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
              onClick={crear}
              className="px-4 py-2 bg-[#D4B06A] hover:bg-[#c19f57] disabled:opacity-50 text-[#2F2F2F] font-bold text-sm rounded-lg transition-colors"
            >
              {busy ? "Creando…" : esCobro ? "Crear plan de pago" : "Crear pago a proveedor"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
