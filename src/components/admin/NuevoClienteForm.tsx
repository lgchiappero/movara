"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const inputClass =
  "w-full rounded-lg border border-[#E5E5E5] px-3 py-2 text-sm text-[#1a1a1a] bg-white focus:outline-none focus:ring-2 focus:ring-[#D4B06A]";

type FormState = {
  nombre: string;
  dni: string;
  cuit: string;
  domicilio: string;
  email: string;
  telefono: string;
  notas: string;
};

const EMPTY: FormState = {
  nombre: "",
  dni: "",
  cuit: "",
  domicilio: "",
  email: "",
  telefono: "",
  notas: "",
};

export default function NuevoClienteForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function crear() {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/admin/clientes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: form.nombre.trim(),
          dni: form.dni.trim() || null,
          cuit: form.cuit.trim() || null,
          domicilio: form.domicilio.trim() || null,
          email: form.email.trim() || null,
          telefono: form.telefono.trim() || null,
          notas: form.notas.trim() || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "No pudimos crear el cliente.");
        return;
      }
      router.push(`/admin/clientes/${json.id}`);
    } catch {
      setError("No pudimos crear el cliente. Probá de nuevo.");
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
        + Nuevo cliente
      </button>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-[#E5E5E5] p-5 space-y-4 w-full max-w-md">
      <h2 className="text-sm font-bold uppercase tracking-widest text-stone-500">Nuevo cliente</h2>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="block space-y-1.5 sm:col-span-2">
          <span className="text-xs font-medium text-stone-500">Nombre *</span>
          <input className={inputClass} value={form.nombre} onChange={(e) => update("nombre", e.target.value)} />
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-stone-500">DNI</span>
          <input className={inputClass} value={form.dni} onChange={(e) => update("dni", e.target.value)} />
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-stone-500">CUIT</span>
          <input className={inputClass} value={form.cuit} onChange={(e) => update("cuit", e.target.value)} />
        </label>
        <label className="block space-y-1.5 sm:col-span-2">
          <span className="text-xs font-medium text-stone-500">Domicilio</span>
          <input className={inputClass} value={form.domicilio} onChange={(e) => update("domicilio", e.target.value)} />
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-stone-500">Email</span>
          <input type="email" className={inputClass} value={form.email} onChange={(e) => update("email", e.target.value)} />
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-stone-500">Teléfono</span>
          <input className={inputClass} value={form.telefono} onChange={(e) => update("telefono", e.target.value)} />
        </label>
        <label className="block space-y-1.5 sm:col-span-2">
          <span className="text-xs font-medium text-stone-500">Notas</span>
          <textarea className={inputClass} rows={2} value={form.notas} onChange={(e) => update("notas", e.target.value)} />
        </label>
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          disabled={busy || form.nombre.trim().length < 2}
          onClick={crear}
          className="px-5 py-2.5 bg-[#D4B06A] hover:bg-[#c19f5a] disabled:opacity-50 text-[#1a1a1a] font-bold text-sm rounded-xl transition-colors"
        >
          {busy ? "Creando..." : "Crear cliente"}
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
