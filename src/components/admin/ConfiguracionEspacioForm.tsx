"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MOVARA_MODELS, FINALIDADES } from "@/data/configurador-catalog";
import { ADMIN_EXTRAS } from "@/data/admin-extras";
import {
  tipoCocinaOptions,
  tipoAguaOptions,
  lavarropasOptions,
} from "@/lib/validators/pedido";
import {
  tipoCocinaLabelsEs,
  tipoAguaLabelsEs,
  lavarropasLabelsEs,
} from "@/lib/pdf/pedido-labels-es";
import { materialesTextoKeys } from "@/lib/validators/admin-pedido-espacio";

const inputClass =
  "w-full rounded-lg border border-[#E5E5E5] px-3 py-2.5 text-sm text-[#2F2F2F] bg-white focus:outline-none focus:ring-2 focus:ring-sage-500";
const labelClass = "text-sm font-medium text-[#2F2F2F]";
const checkboxRowClass = "flex items-center gap-2 text-sm text-[#2F2F2F]";

const PROVINCIAS = [
  "Buenos Aires", "Ciudad Autónoma de Buenos Aires", "Catamarca", "Chaco",
  "Chubut", "Córdoba", "Corrientes", "Entre Ríos", "Formosa", "Jujuy",
  "La Pampa", "La Rioja", "Mendoza", "Misiones", "Neuquén", "Río Negro",
  "Salta", "San Juan", "San Luis", "Santa Cruz", "Santa Fe",
  "Santiago del Estero", "Tierra del Fuego", "Tucumán",
];

const MATERIALES_LABELS: Record<(typeof materialesTextoKeys)[number], string> = {
  exterior: "Apariencia exterior",
  piso: "Tipo de piso",
  panelesBano: "Paneles de baño",
  puertaBano: "Puerta de baño",
  cocina: "Cocina",
  mesada: "Mesada",
  puertaPrincipal: "Puerta principal",
  ventanas: "Ventanas",
};

type Espacio = {
  modelo: string | null;
  finalidad: string | null;
  provincia: string | null;
  localidad: string | null;
  habitaciones: number | null;
  incluyeCocina: boolean;
  tipoCocina: string | null;
  incluyeBano: boolean;
  tipoAgua: string | null;
  lavarropas: string | null;
  materiales: Record<string, string | null> | null;
  upgrades: string[];
  notasConfiguracion: string | null;
};

export default function ConfiguracionEspacioForm({ id, initial }: { id: string; initial: Espacio }) {
  const router = useRouter();
  const [form, setForm] = useState({
    modelo: initial.modelo ?? "",
    finalidad: initial.finalidad ?? "",
    provincia: initial.provincia ?? "",
    localidad: initial.localidad ?? "",
    habitaciones: initial.habitaciones?.toString() ?? "",
    incluyeCocina: initial.incluyeCocina,
    tipoCocina: initial.tipoCocina ?? "",
    incluyeBano: initial.incluyeBano,
    tipoAgua: initial.tipoAgua ?? "",
    lavarropas: initial.lavarropas ?? "",
    materiales: Object.fromEntries(
      materialesTextoKeys.map((k) => [k, initial.materiales?.[k] ?? ""])
    ) as Record<string, string>,
    upgrades: new Set(initial.upgrades ?? []),
    notasConfiguracion: initial.notasConfiguracion ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  }

  function setMaterial(key: string, value: string) {
    setForm((f) => ({ ...f, materiales: { ...f.materiales, [key]: value } }));
    setSaved(false);
  }

  function toggleExtra(key: string, checked: boolean) {
    setForm((f) => {
      const next = new Set(f.upgrades);
      if (checked) next.add(key);
      else next.delete(key);
      return { ...f, upgrades: next };
    });
    setSaved(false);
  }

  async function guardar() {
    setError(null);
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/configuraciones/${id}/espacio`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          modelo: form.modelo || null,
          finalidad: form.finalidad || null,
          provincia: form.provincia || null,
          localidad: form.localidad || null,
          habitaciones: form.habitaciones ? Number(form.habitaciones) : null,
          incluyeCocina: form.incluyeCocina,
          tipoCocina: form.tipoCocina || null,
          incluyeBano: form.incluyeBano,
          tipoAgua: form.tipoAgua || null,
          lavarropas: form.lavarropas || null,
          materiales: Object.fromEntries(
            materialesTextoKeys.map((k) => [k, form.materiales[k]?.trim() || null])
          ),
          upgrades: Array.from(form.upgrades),
          notasConfiguracion: form.notasConfiguracion.trim() || null,
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setError(json?.error ?? "No pudimos guardar la configuración.");
        return;
      }
      setSaved(true);
      router.refresh();
    } catch {
      setError("No pudimos guardar la configuración. Probá de nuevo.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-[#E5E5E5] p-5 space-y-6">
      <h2 className="text-sm font-bold uppercase tracking-widest text-sage-600">
        Configuración del espacio
      </h2>

      <div className="space-y-3">
        <p className="text-xs font-bold uppercase tracking-widest text-stone-400">
          Modelo y tamaño
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="block space-y-1.5">
            <span className={labelClass}>Modelo</span>
            <select className={inputClass} value={form.modelo} onChange={(e) => set("modelo", e.target.value)}>
              <option value="">Sin definir</option>
              {MOVARA_MODELS.map((m) => (
                <option key={m.key} value={m.key}>
                  {m.nombre} ({m.superficie} m²)
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1.5">
            <span className={labelClass}>Finalidad</span>
            <select
              className={inputClass}
              value={form.finalidad}
              onChange={(e) => set("finalidad", e.target.value)}
            >
              <option value="">Sin definir</option>
              {FINALIDADES.map((f) => (
                <option key={f.key} value={f.key}>
                  {f.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1.5">
            <span className={labelClass}>Provincia</span>
            <select
              className={inputClass}
              value={form.provincia}
              onChange={(e) => set("provincia", e.target.value)}
            >
              <option value="">Sin definir</option>
              {PROVINCIAS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1.5">
            <span className={labelClass}>Localidad</span>
            <input
              className={inputClass}
              value={form.localidad}
              onChange={(e) => set("localidad", e.target.value)}
            />
          </label>
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-xs font-bold uppercase tracking-widest text-stone-400">
          Distribución interior
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="block space-y-1.5">
            <span className={labelClass}>Cantidad de habitaciones</span>
            <select
              className={inputClass}
              value={form.habitaciones}
              onChange={(e) => set("habitaciones", e.target.value)}
            >
              <option value="">Sin definir</option>
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
            </select>
          </label>
          <label className="block space-y-1.5">
            <span className={labelClass}>Espacio para lavarropas</span>
            <select
              className={inputClass}
              value={form.lavarropas}
              onChange={(e) => set("lavarropas", e.target.value)}
            >
              <option value="">Sin definir</option>
              {lavarropasOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {lavarropasLabelsEs[opt]}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className={checkboxRowClass}>
              <input
                type="checkbox"
                checked={form.incluyeCocina}
                onChange={(e) => set("incluyeCocina", e.target.checked)}
              />
              Incluye cocina
            </label>
            {form.incluyeCocina && (
              <select
                aria-label="Tipo de cocción"
                className={inputClass}
                value={form.tipoCocina}
                onChange={(e) => set("tipoCocina", e.target.value)}
              >
                <option value="">Sin definir</option>
                {tipoCocinaOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {tipoCocinaLabelsEs[opt]}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div className="space-y-2">
            <label className={checkboxRowClass}>
              <input
                type="checkbox"
                checked={form.incluyeBano}
                onChange={(e) => set("incluyeBano", e.target.checked)}
              />
              Incluye baño
            </label>
            {form.incluyeBano && (
              <select
                aria-label="Tipo de agua caliente"
                className={inputClass}
                value={form.tipoAgua}
                onChange={(e) => set("tipoAgua", e.target.value)}
              >
                <option value="">Sin definir</option>
                {tipoAguaOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {tipoAguaLabelsEs[opt]}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-xs font-bold uppercase tracking-widest text-stone-400">
          Materiales seleccionados
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {materialesTextoKeys.map((key) => (
            <label key={key} className="block space-y-1.5">
              <span className={labelClass}>{MATERIALES_LABELS[key]}</span>
              <input
                className={inputClass}
                value={form.materiales[key] ?? ""}
                onChange={(e) => setMaterial(key, e.target.value)}
                placeholder="Ej: Blanco liso"
              />
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-xs font-bold uppercase tracking-widest text-stone-400">
          Extras y mejoras
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {ADMIN_EXTRAS.map((extra) => (
            <label key={extra.key} className={checkboxRowClass}>
              <input
                type="checkbox"
                checked={form.upgrades.has(extra.key)}
                onChange={(e) => toggleExtra(extra.key, e.target.checked)}
              />
              {extra.label}
            </label>
          ))}
        </div>
        <label className="block space-y-1.5">
          <span className={labelClass}>Notas adicionales del cliente</span>
          <textarea
            className={inputClass}
            rows={3}
            value={form.notasConfiguracion}
            onChange={(e) => set("notasConfiguracion", e.target.value)}
          />
        </label>
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}
      {saved && !error && <p className="text-xs text-sage-600">Configuración guardada.</p>}

      <button
        type="button"
        disabled={saving}
        onClick={guardar}
        className="w-full py-3 bg-sage-500 hover:bg-sage-600 disabled:opacity-60 text-[#2F2F2F] font-bold text-sm rounded-xl transition-colors"
      >
        {saving ? "Guardando..." : "Guardar configuración"}
      </button>
    </div>
  );
}
