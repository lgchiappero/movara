"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FINALIDADES } from "@/data/configurador-catalog";
import { tipoClienteOptions } from "@/lib/validators/pedido";

const inputClass =
  "w-full rounded-lg border border-[#E5E5E5] px-3 py-2 text-sm text-[#1a1a1a] bg-white focus:outline-none focus:ring-2 focus:ring-[#D4B06A]";

const PROVINCIAS = [
  "Buenos Aires", "Ciudad Autónoma de Buenos Aires", "Catamarca", "Chaco",
  "Chubut", "Córdoba", "Corrientes", "Entre Ríos", "Formosa", "Jujuy",
  "La Pampa", "La Rioja", "Mendoza", "Misiones", "Neuquén", "Río Negro",
  "Salta", "San Juan", "San Luis", "Santa Cruz", "Santa Fe",
  "Santiago del Estero", "Tierra del Fuego", "Tucumán",
];

const MODELO_OPTIONS = [
  { value: "10ft", label: "Flex 18 (18 m²)" },
  { value: "20ft", label: "Flex 38 (38 m²)" },
  { value: "40ft", label: "Flex 77 (77 m²)" },
];

type Vendedor = { email: string; nombre: string };

type FormState = {
  clienteNombre: string;
  tipoCliente: "particular" | "empresa";
  razonSocial: string;
  clienteEmail: string;
  clienteWhatsapp: string;
  provincia: string;
  modelo: string;
  finalidad: string;
  vendedorAsignado: string;
  notasInternas: string;
};

const EMPTY: FormState = {
  clienteNombre: "",
  tipoCliente: "particular",
  razonSocial: "",
  clienteEmail: "",
  clienteWhatsapp: "",
  provincia: "",
  modelo: "",
  finalidad: "",
  vendedorAsignado: "",
  notasInternas: "",
};

export default function NuevoPedidoManualForm({ vendedores }: { vendedores: Vendedor[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const puedeGuardar =
    form.clienteNombre.trim().length >= 3 &&
    form.clienteWhatsapp.trim().length >= 8 &&
    (form.tipoCliente !== "empresa" || form.razonSocial.trim().length >= 3);

  async function crear() {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/admin/configuraciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clienteNombre: form.clienteNombre.trim(),
          tipoCliente: form.tipoCliente,
          razonSocial: form.razonSocial.trim() || undefined,
          clienteEmail: form.clienteEmail.trim(),
          clienteWhatsapp: form.clienteWhatsapp.trim(),
          provincia: form.provincia || undefined,
          modelo: form.modelo || undefined,
          finalidad: form.finalidad || undefined,
          vendedorAsignado: form.vendedorAsignado || undefined,
          notasInternas: form.notasInternas.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "No pudimos crear el pedido.");
        return;
      }
      router.push(`/admin/configuraciones/${json.id}`);
    } catch {
      setError("No pudimos crear el pedido. Probá de nuevo.");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="px-5 py-3 bg-[#D4B06A] hover:bg-[#c19f5a] text-[#1a1a1a] font-bold text-sm rounded-xl transition-colors"
      >
        + Nuevo pedido manual
      </button>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-[#E5E5E5] p-5 space-y-5">
      <h2 className="text-sm font-bold uppercase tracking-widest text-stone-500">
        Nuevo pedido manual
      </h2>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      <div className="space-y-3">
        <p className="text-xs font-bold uppercase tracking-widest text-stone-400">
          Datos del cliente
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-stone-500">Nombre y apellido *</span>
            <input
              className={inputClass}
              value={form.clienteNombre}
              onChange={(e) => update("clienteNombre", e.target.value)}
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-stone-500">Tipo de cliente</span>
            <select
              className={inputClass}
              value={form.tipoCliente}
              onChange={(e) => update("tipoCliente", e.target.value as FormState["tipoCliente"])}
            >
              {tipoClienteOptions.map((t) => (
                <option key={t} value={t}>
                  {t === "particular" ? "Particular" : "Empresa"}
                </option>
              ))}
            </select>
          </label>
          {form.tipoCliente === "empresa" && (
            <label className="block space-y-1.5 sm:col-span-2">
              <span className="text-xs font-medium text-stone-500">Razón social *</span>
              <input
                className={inputClass}
                value={form.razonSocial}
                onChange={(e) => update("razonSocial", e.target.value)}
              />
            </label>
          )}
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-stone-500">Email</span>
            <input
              type="email"
              className={inputClass}
              value={form.clienteEmail}
              onChange={(e) => update("clienteEmail", e.target.value)}
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-stone-500">Teléfono / WhatsApp *</span>
            <input
              className={inputClass}
              value={form.clienteWhatsapp}
              onChange={(e) => update("clienteWhatsapp", e.target.value)}
              placeholder="+54 9 11 1234-5678"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-stone-500">Provincia</span>
            <select
              className={inputClass}
              value={form.provincia}
              onChange={(e) => update("provincia", e.target.value)}
            >
              <option value="">Sin definir</option>
              {PROVINCIAS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-xs font-bold uppercase tracking-widest text-stone-400">
          Datos del pedido
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-stone-500">Modelo</span>
            <select
              className={inputClass}
              value={form.modelo}
              onChange={(e) => update("modelo", e.target.value)}
            >
              <option value="">Sin definir</option>
              {MODELO_OPTIONS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-stone-500">Finalidad</span>
            <select
              className={inputClass}
              value={form.finalidad}
              onChange={(e) => update("finalidad", e.target.value)}
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
            <span className="text-xs font-medium text-stone-500">Vendedor asignado</span>
            <select
              className={inputClass}
              value={form.vendedorAsignado}
              onChange={(e) => update("vendedorAsignado", e.target.value)}
            >
              <option value="">Sin asignar</option>
              {vendedores.map((v) => (
                <option key={v.email} value={v.email}>
                  {v.nombre}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-stone-500">Notas internas</span>
          <textarea
            className={inputClass}
            rows={3}
            value={form.notasInternas}
            onChange={(e) => update("notasInternas", e.target.value)}
          />
        </label>
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          disabled={busy || !puedeGuardar}
          onClick={crear}
          className="px-5 py-2.5 bg-[#D4B06A] hover:bg-[#c19f5a] disabled:opacity-50 text-[#1a1a1a] font-bold text-sm rounded-xl transition-colors"
        >
          {busy ? "Creando..." : "Crear pedido"}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setForm(EMPTY);
            setError(null);
          }}
          className="px-5 py-2.5 border border-stone-300 text-stone-600 hover:bg-stone-50 font-medium text-sm rounded-xl transition-colors"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
