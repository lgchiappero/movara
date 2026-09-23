"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const inputClass =
  "w-full rounded-lg border border-[#E5E5E5] px-3 py-2.5 text-sm text-[#2F2F2F] bg-white focus:outline-none focus:ring-2 focus:ring-sage-500";
const labelClass = "text-sm font-medium text-[#2F2F2F]";

type Envio = {
  numeroPI: string | null;
  numeroBL: string | null;
  numeroContenedor: string | null;
  fechaEmbarque: string | null;
  fechaArriboEstimado: string | null;
  fechaArribo: string | null;
  costoPI: number | null;
  costoFlete: number | null;
  costoSeguro: number | null;
  costoAduana: number | null;
  costoOtrosInternacional: number | null;
  notas: string | null;
};

function toDateInput(value: string | null): string {
  return value ? value.slice(0, 10) : "";
}

function toNumberOrNull(value: string): number | null {
  return value.trim() === "" ? null : Number(value);
}

export default function EnvioDetailForm({ id, initial }: { id: string; initial: Envio }) {
  const router = useRouter();
  const [form, setForm] = useState({
    numeroPI: initial.numeroPI ?? "",
    numeroBL: initial.numeroBL ?? "",
    numeroContenedor: initial.numeroContenedor ?? "",
    fechaEmbarque: toDateInput(initial.fechaEmbarque),
    fechaArriboEstimado: toDateInput(initial.fechaArriboEstimado),
    fechaArribo: toDateInput(initial.fechaArribo),
    costoPI: initial.costoPI?.toString() ?? "",
    costoFlete: initial.costoFlete?.toString() ?? "",
    costoSeguro: initial.costoSeguro?.toString() ?? "",
    costoAduana: initial.costoAduana?.toString() ?? "",
    costoOtrosInternacional: initial.costoOtrosInternacional?.toString() ?? "",
    notas: initial.notas ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function guardar() {
    setError(null);
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/envios/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          numeroPI: form.numeroPI.trim() || null,
          numeroBL: form.numeroBL.trim() || null,
          numeroContenedor: form.numeroContenedor.trim() || null,
          fechaEmbarque: form.fechaEmbarque || null,
          fechaArriboEstimado: form.fechaArriboEstimado || null,
          fechaArribo: form.fechaArribo || null,
          costoPI: toNumberOrNull(form.costoPI),
          costoFlete: toNumberOrNull(form.costoFlete),
          costoSeguro: toNumberOrNull(form.costoSeguro),
          costoAduana: toNumberOrNull(form.costoAduana),
          costoOtrosInternacional: toNumberOrNull(form.costoOtrosInternacional),
          notas: form.notas.trim() || null,
        }),
      });
      if (!res.ok) throw new Error("request-failed");
      router.refresh();
    } catch {
      setError("No pudimos guardar los cambios. Probá de nuevo.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-[#E5E5E5] p-5 space-y-4">
      <h2 className="text-sm font-bold uppercase tracking-widest text-sage-600">Datos del envío</h2>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <label className="block space-y-1.5">
          <span className={labelClass}>N° PI</span>
          <input className={inputClass} value={form.numeroPI} onChange={(e) => set("numeroPI", e.target.value)} />
        </label>
        <label className="block space-y-1.5">
          <span className={labelClass}>N° BL</span>
          <input className={inputClass} value={form.numeroBL} onChange={(e) => set("numeroBL", e.target.value)} />
        </label>
        <label className="block space-y-1.5">
          <span className={labelClass}>N° Contenedor</span>
          <input
            className={inputClass}
            value={form.numeroContenedor}
            onChange={(e) => set("numeroContenedor", e.target.value)}
          />
        </label>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <label className="block space-y-1.5">
          <span className={labelClass}>Fecha embarque</span>
          <input
            type="date"
            className={inputClass}
            value={form.fechaEmbarque}
            onChange={(e) => set("fechaEmbarque", e.target.value)}
          />
        </label>
        <label className="block space-y-1.5">
          <span className={labelClass}>Arribo estimado</span>
          <input
            type="date"
            className={inputClass}
            value={form.fechaArriboEstimado}
            onChange={(e) => set("fechaArriboEstimado", e.target.value)}
          />
        </label>
        <label className="block space-y-1.5">
          <span className={labelClass}>Fecha arribo</span>
          <input
            type="date"
            className={inputClass}
            value={form.fechaArribo}
            onChange={(e) => set("fechaArribo", e.target.value)}
          />
        </label>
      </div>

      <div className="rounded-2xl border border-[#F3C6C6] p-4 space-y-3" style={{ backgroundColor: "#fff0f0" }}>
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-widest text-red-700">Costos internacionales</h3>
          <span className="px-2 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700">
            🔒 Privado — no visible para el cliente
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <label className="block space-y-1.5">
            <span className={labelClass}>Costo PI (USD)</span>
            <input
              type="number"
              step="0.01"
              className={inputClass}
              value={form.costoPI}
              onChange={(e) => set("costoPI", e.target.value)}
            />
          </label>
          <label className="block space-y-1.5">
            <span className={labelClass}>Flete (USD)</span>
            <input
              type="number"
              step="0.01"
              className={inputClass}
              value={form.costoFlete}
              onChange={(e) => set("costoFlete", e.target.value)}
            />
          </label>
          <label className="block space-y-1.5">
            <span className={labelClass}>Seguro (USD)</span>
            <input
              type="number"
              step="0.01"
              className={inputClass}
              value={form.costoSeguro}
              onChange={(e) => set("costoSeguro", e.target.value)}
            />
          </label>
          <label className="block space-y-1.5">
            <span className={labelClass}>Aduana (USD)</span>
            <input
              type="number"
              step="0.01"
              className={inputClass}
              value={form.costoAduana}
              onChange={(e) => set("costoAduana", e.target.value)}
            />
          </label>
          <label className="block space-y-1.5">
            <span className={labelClass}>Otros costos internacionales (USD)</span>
            <input
              type="number"
              step="0.01"
              className={inputClass}
              value={form.costoOtrosInternacional}
              onChange={(e) => set("costoOtrosInternacional", e.target.value)}
            />
          </label>
        </div>
      </div>

      <label className="block space-y-1.5">
        <span className={labelClass}>Notas</span>
        <textarea className={inputClass} rows={3} value={form.notas} onChange={(e) => set("notas", e.target.value)} />
      </label>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <button
        type="button"
        disabled={saving}
        onClick={guardar}
        className="w-full py-3 bg-sage-500 hover:bg-sage-600 disabled:opacity-60 text-[#2F2F2F] font-bold text-sm rounded-xl transition-colors"
      >
        {saving ? "Guardando..." : "Guardar cambios"}
      </button>
    </div>
  );
}
