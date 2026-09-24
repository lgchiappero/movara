"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  estadoFabricacionOptions,
  estadoFabricacionLabels,
  estadoFabricacionIndex,
  MODELOS_UNIDAD,
  type EstadoFabricacion,
} from "@/lib/envios/constantes";

const inputClass =
  "w-full rounded-lg border border-[#E5E5E5] px-3 py-2.5 text-sm text-[#2F2F2F] bg-white focus:outline-none focus:ring-2 focus:ring-sage-500";
const labelClass = "text-sm font-medium text-[#2F2F2F]";
const readonlyClass =
  "w-full rounded-lg border border-[#E5E5E5] px-3 py-2.5 text-sm text-stone-500 bg-[#F4F4F4]";
const checkboxRowClass = "flex items-center gap-2 text-sm text-[#2F2F2F]";

const PROVINCIAS = [
  "Buenos Aires", "Ciudad Autónoma de Buenos Aires", "Catamarca", "Chaco",
  "Chubut", "Córdoba", "Corrientes", "Entre Ríos", "Formosa", "Jujuy",
  "La Pampa", "La Rioja", "Mendoza", "Misiones", "Neuquén", "Río Negro",
  "Salta", "San Juan", "San Luis", "Santa Cruz", "Santa Fe",
  "Santiago del Estero", "Tierra del Fuego", "Tucumán",
];

type Cliente = { id: string; nombre: string };
type Envio = {
  id: string;
  numeroPI: string | null;
  numeroContenedor: string | null;
  fechaArriboEstimado: string | null;
};

type Unidad = {
  clienteId: string;
  envioId: string | null;
  modelo: string | null;
  configuracion: Record<string, unknown> | null;
  precioCliente: number | null;
  estadoFabricacion: string;
  provinciaDestino: string | null;
  localidadDestino: string | null;
  direccionEntrega: string | null;
  costoTransporteNacional: number | null;
  costoGrua: number | null;
  fechaEntregaEstimada: string | null;
  fechaEntrega: string | null;
  garantiaActivada: boolean;
  garantiaInicio: string | null;
  garantiaFin: string | null;
  notas: string | null;
};

function toDateInput(value: string | null): string {
  return value ? value.slice(0, 10) : "";
}

function toNumberOrNull(value: string): number | null {
  return value.trim() === "" ? null : Number(value);
}

function EstadoTimeline({ estado }: { estado: string }) {
  const actualIdx = estadoFabricacionIndex(estado);
  return (
    <div className="flex items-center overflow-x-auto pb-1">
      {estadoFabricacionOptions.map((e, i) => {
        const estaCompleto = i < actualIdx;
        const esActual = i === actualIdx;
        return (
          <div key={e} className="flex items-center flex-shrink-0">
            <div className="flex flex-col items-center gap-1">
              <div
                className={`w-3 h-3 rounded-full ${
                  esActual ? "bg-[#D4B06A] ring-2 ring-[#D4B06A]/30" : estaCompleto ? "bg-sage-500" : "bg-stone-200"
                }`}
              />
              <span
                className={`text-[10px] whitespace-nowrap ${esActual ? "font-bold text-[#2F2F2F]" : "text-stone-400"}`}
              >
                {estadoFabricacionLabels[e as EstadoFabricacion]}
              </span>
            </div>
            {i < estadoFabricacionOptions.length - 1 && (
              <div className={`w-8 h-0.5 ${estaCompleto ? "bg-sage-500" : "bg-stone-200"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function UnidadDetailForm({
  id,
  initial,
  clientes,
  envios,
}: {
  id: string;
  initial: Unidad;
  clientes: Cliente[];
  envios: Envio[];
}) {
  const router = useRouter();
  const [form, setForm] = useState({
    clienteId: initial.clienteId,
    envioId: initial.envioId ?? "",
    modelo: initial.modelo ?? "",
    configuracionTexto: initial.configuracion ? JSON.stringify(initial.configuracion, null, 2) : "",
    precioCliente: initial.precioCliente?.toString() ?? "",
    estadoFabricacion: initial.estadoFabricacion,
    provinciaDestino: initial.provinciaDestino ?? "",
    localidadDestino: initial.localidadDestino ?? "",
    direccionEntrega: initial.direccionEntrega ?? "",
    costoTransporteNacional: initial.costoTransporteNacional?.toString() ?? "",
    costoGrua: initial.costoGrua?.toString() ?? "",
    fechaEntregaEstimada: toDateInput(initial.fechaEntregaEstimada),
    fechaEntrega: toDateInput(initial.fechaEntrega),
    garantiaActivada: initial.garantiaActivada,
    garantiaInicio: toDateInput(initial.garantiaInicio),
    notas: initial.notas ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const envioSeleccionado = envios.find((e) => e.id === form.envioId) ?? null;

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function guardar() {
    setError(null);

    let configuracion: Record<string, unknown> | null = null;
    if (form.configuracionTexto.trim()) {
      try {
        configuracion = JSON.parse(form.configuracionTexto);
      } catch {
        setError("La configuración no es un JSON válido.");
        return;
      }
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/admin/unidades/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clienteId: form.clienteId,
          envioId: form.envioId || null,
          modelo: form.modelo || null,
          configuracion,
          precioCliente: toNumberOrNull(form.precioCliente),
          estadoFabricacion: form.estadoFabricacion,
          provinciaDestino: form.provinciaDestino || null,
          localidadDestino: form.localidadDestino || null,
          direccionEntrega: form.direccionEntrega || null,
          costoTransporteNacional: toNumberOrNull(form.costoTransporteNacional),
          costoGrua: toNumberOrNull(form.costoGrua),
          fechaEntregaEstimada: form.fechaEntregaEstimada || null,
          fechaEntrega: form.fechaEntrega || null,
          garantiaActivada: form.garantiaActivada,
          garantiaInicio: form.garantiaInicio || null,
          notas: form.notas || null,
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
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-[#E5E5E5] p-5 space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-widest text-sage-600">Estado de fabricación</h2>
        <EstadoTimeline estado={form.estadoFabricacion} />
        <label className="block space-y-1.5">
          <span className={labelClass}>Estado</span>
          <select
            className={inputClass}
            value={form.estadoFabricacion}
            onChange={(e) => set("estadoFabricacion", e.target.value)}
          >
            {estadoFabricacionOptions.map((e) => (
              <option key={e} value={e}>
                {estadoFabricacionLabels[e]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="bg-white rounded-2xl border border-[#E5E5E5] p-5 space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-widest text-sage-600">Cliente y envío</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="block space-y-1.5">
            <span className={labelClass}>Cliente</span>
            <select className={inputClass} value={form.clienteId} onChange={(e) => set("clienteId", e.target.value)}>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1.5">
            <span className={labelClass}>Envío</span>
            <select className={inputClass} value={form.envioId} onChange={(e) => set("envioId", e.target.value)}>
              <option value="">Sin asignar</option>
              {envios.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.numeroPI ?? `Envío ${e.id.slice(-6)}`}
                </option>
              ))}
            </select>
          </label>
        </div>
        {envioSeleccionado && (
          <div className="bg-[#F4F4F4] rounded-xl p-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
            <div>
              <p className="text-xs text-stone-500">N° PI</p>
              <p className="font-medium text-[#2F2F2F]">{envioSeleccionado.numeroPI || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-stone-500">N° Contenedor</p>
              <p className="font-medium text-[#2F2F2F]">{envioSeleccionado.numeroContenedor || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-stone-500">Arribo estimado</p>
              <p className="font-medium text-[#2F2F2F]">
                {envioSeleccionado.fechaArriboEstimado
                  ? new Date(envioSeleccionado.fechaArriboEstimado).toLocaleDateString("es-AR", {
                      timeZone: "UTC",
                    })
                  : "—"}
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-[#E5E5E5] p-5 space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-widest text-sage-600">Configuración del producto</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="block space-y-1.5">
            <span className={labelClass}>Modelo</span>
            <select className={inputClass} value={form.modelo} onChange={(e) => set("modelo", e.target.value)}>
              <option value="">Sin definir</option>
              {MODELOS_UNIDAD.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1.5">
            <span className={labelClass}>Precio cliente (USD)</span>
            <input
              type="number"
              step="0.01"
              className={inputClass}
              value={form.precioCliente}
              onChange={(e) => set("precioCliente", e.target.value)}
            />
          </label>
        </div>
        <label className="block space-y-1.5">
          <span className={labelClass}>Configuración completa (JSON)</span>
          <textarea
            className={`${inputClass} font-mono text-xs`}
            rows={6}
            value={form.configuracionTexto}
            onChange={(e) => set("configuracionTexto", e.target.value)}
            placeholder="{}"
          />
        </label>
      </div>

      <div className="bg-white rounded-2xl border border-[#E5E5E5] p-5 space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-widest text-sage-600">Logística nacional</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="block space-y-1.5">
            <span className={labelClass}>Provincia destino</span>
            <select
              className={inputClass}
              value={form.provinciaDestino}
              onChange={(e) => set("provinciaDestino", e.target.value)}
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
            <span className={labelClass}>Localidad destino</span>
            <input
              className={inputClass}
              value={form.localidadDestino}
              onChange={(e) => set("localidadDestino", e.target.value)}
            />
          </label>
          <label className="block space-y-1.5 sm:col-span-2">
            <span className={labelClass}>Dirección de entrega</span>
            <input
              className={inputClass}
              value={form.direccionEntrega}
              onChange={(e) => set("direccionEntrega", e.target.value)}
            />
          </label>
          <label className="block space-y-1.5">
            <span className={labelClass}>Costo transporte nacional (USD)</span>
            <input
              type="number"
              step="0.01"
              className={inputClass}
              value={form.costoTransporteNacional}
              onChange={(e) => set("costoTransporteNacional", e.target.value)}
            />
          </label>
          <label className="block space-y-1.5">
            <span className={labelClass}>Costo grúa (USD)</span>
            <input
              type="number"
              step="0.01"
              className={inputClass}
              value={form.costoGrua}
              onChange={(e) => set("costoGrua", e.target.value)}
            />
          </label>
          <label className="block space-y-1.5">
            <span className={labelClass}>Fecha entrega estimada</span>
            <input
              type="date"
              className={inputClass}
              value={form.fechaEntregaEstimada}
              onChange={(e) => set("fechaEntregaEstimada", e.target.value)}
            />
          </label>
          <label className="block space-y-1.5">
            <span className={labelClass}>Fecha entrega</span>
            <input
              type="date"
              className={inputClass}
              value={form.fechaEntrega}
              onChange={(e) => set("fechaEntrega", e.target.value)}
            />
          </label>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-[#E5E5E5] p-5 space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-widest text-sage-600">Garantía MOVARA (12 meses)</h2>
        <label className={checkboxRowClass}>
          <input
            type="checkbox"
            checked={form.garantiaActivada}
            onChange={(e) => set("garantiaActivada", e.target.checked)}
          />
          Garantía activada
        </label>
        <div className="grid grid-cols-2 gap-4">
          <label className="block space-y-1.5">
            <span className={labelClass}>Fecha inicio</span>
            <input
              type="date"
              className={inputClass}
              value={form.garantiaInicio}
              onChange={(e) => set("garantiaInicio", e.target.value)}
            />
          </label>
          <label className="block space-y-1.5">
            <span className={labelClass}>Fecha fin (calculada)</span>
            <p className={readonlyClass}>
              {initial.garantiaFin
                ? new Date(initial.garantiaFin).toLocaleDateString("es-AR", { timeZone: "UTC" })
                : "—"}
            </p>
          </label>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-[#E5E5E5] p-5 space-y-4">
        <label className="block space-y-1.5">
          <span className={labelClass}>Notas</span>
          <textarea className={inputClass} rows={3} value={form.notas} onChange={(e) => set("notas", e.target.value)} />
        </label>
      </div>

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
