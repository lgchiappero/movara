"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/admin/Toast";

const inputClass =
  "w-full rounded-lg border border-[#E5E5E5] px-3 py-2.5 text-sm text-[#2F2F2F] bg-white focus:outline-none focus:ring-2 focus:ring-sage-500";
const labelClass = "text-sm font-medium text-[#2F2F2F]";

type Cliente = {
  nombre: string;
  dni: string | null;
  cuit: string | null;
  domicilio: string | null;
  email: string | null;
  telefono: string | null;
  notas: string | null;
};

export default function ClienteDetailForm({ id, initial }: { id: string; initial: Cliente }) {
  const router = useRouter();
  const [form, setForm] = useState({
    nombre: initial.nombre,
    dni: initial.dni ?? "",
    cuit: initial.cuit ?? "",
    domicilio: initial.domicilio ?? "",
    email: initial.email ?? "",
    telefono: initial.telefono ?? "",
    notas: initial.notas ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { showSuccess, showError } = useToast();

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function guardar() {
    setError(null);
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/clientes/${id}`, {
        method: "PATCH",
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
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        const message = json?.error ?? "No pudimos guardar los cambios.";
        setError(message);
        showError(message);
        return;
      }
      showSuccess();
      router.refresh();
    } catch {
      const message = "No pudimos guardar los cambios. Probá de nuevo.";
      setError(message);
      showError(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-[#E5E5E5] p-5 space-y-4">
      <h2 className="text-sm font-bold uppercase tracking-widest text-sage-600">Datos del cliente</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="block space-y-1.5 sm:col-span-2">
          <span className={labelClass}>Nombre</span>
          <input className={inputClass} value={form.nombre} onChange={(e) => set("nombre", e.target.value)} />
        </label>
        <label className="block space-y-1.5">
          <span className={labelClass}>DNI</span>
          <input className={inputClass} value={form.dni} onChange={(e) => set("dni", e.target.value)} />
        </label>
        <label className="block space-y-1.5">
          <span className={labelClass}>CUIT</span>
          <input className={inputClass} value={form.cuit} onChange={(e) => set("cuit", e.target.value)} />
        </label>
        <label className="block space-y-1.5 sm:col-span-2">
          <span className={labelClass}>Domicilio</span>
          <input className={inputClass} value={form.domicilio} onChange={(e) => set("domicilio", e.target.value)} />
        </label>
        <label className="block space-y-1.5">
          <span className={labelClass}>Email</span>
          <input type="email" className={inputClass} value={form.email} onChange={(e) => set("email", e.target.value)} />
        </label>
        <label className="block space-y-1.5">
          <span className={labelClass}>Teléfono</span>
          <input className={inputClass} value={form.telefono} onChange={(e) => set("telefono", e.target.value)} />
        </label>
        <label className="block space-y-1.5 sm:col-span-2">
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
