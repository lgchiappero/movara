"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/admin/Toast";
import { ORIGEN_OPTIONS, ORIGEN_LABELS } from "@/lib/leads/constantes";
import { MODELOS_UNIDAD } from "@/lib/envios/constantes";

const inputClass =
  "w-full rounded-lg border border-[#E5E5E5] px-3 py-2 text-sm text-[#2F2F2F] bg-white focus:outline-none focus:ring-2 focus:ring-sage-500";
const labelClass = "text-xs font-medium text-stone-500";

const MODELO_INTERES_OPTIONS = [...MODELOS_UNIDAD, "Varios"] as const;

type Vendedor = { id: string; nombre: string };

export default function NuevoLeadButton({ vendedores }: { vendedores: Vendedor[] }) {
  const router = useRouter();
  const { showSuccess, showError } = useToast();
  const [open, setOpen] = useState(false);
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [origen, setOrigen] = useState("");
  const [modeloInteres, setModeloInteres] = useState("");
  const [notasVenta, setNotasVenta] = useState("");
  const [vendedorId, setVendedorId] = useState("");
  const [valorEstimado, setValorEstimado] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function resetForm() {
    setNombre("");
    setEmail("");
    setTelefono("");
    setOrigen("");
    setModeloInteres("");
    setNotasVenta("");
    setVendedorId("");
    setValorEstimado("");
    setError(null);
  }

  function cerrar() {
    setOpen(false);
    resetForm();
  }

  async function crear() {
    setError(null);
    if (!nombre.trim()) {
      setError("El nombre es obligatorio");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/admin/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: nombre.trim(),
          email: email.trim() || null,
          telefono: telefono.trim() || null,
          origen: origen || null,
          modeloInteres: modeloInteres || null,
          notasVenta: notasVenta.trim() || null,
          vendedorId: vendedorId || null,
          valorEstimado: valorEstimado.trim() ? Number(valorEstimado) : null,
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        const message = json?.error ?? "No pudimos crear el lead.";
        setError(message);
        showError(message);
        return;
      }
      showSuccess("Lead creado");
      cerrar();
      router.refresh();
    } catch {
      const message = "No pudimos crear el lead. Probá de nuevo.";
      setError(message);
      showError(message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="px-5 py-3 bg-[#D4B06A] hover:bg-[#c19f5a] text-[#1a1a1a] font-bold text-sm rounded-xl transition-colors whitespace-nowrap"
      >
        + Nuevo lead
      </button>

      {open && (
        <>
          <div className="fixed inset-0 bg-black/30 z-40" onClick={cerrar} />
          <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl z-50 overflow-y-auto">
            <div className="p-6 space-y-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sage-500 text-xs font-bold uppercase tracking-widest mb-1">Pipeline</p>
                  <h2 className="text-xl font-bold text-[#2F2F2F]">Nuevo lead</h2>
                </div>
                <button
                  type="button"
                  onClick={cerrar}
                  aria-label="Cerrar"
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-stone-100 text-stone-500 text-xl leading-none"
                >
                  ×
                </button>
              </div>

              {error && <p className="text-xs text-red-600">{error}</p>}

              <div className="space-y-4">
                <label className="block space-y-1">
                  <span className={labelClass}>Nombre completo *</span>
                  <input className={inputClass} value={nombre} onChange={(e) => setNombre(e.target.value)} />
                </label>

                <label className="block space-y-1">
                  <span className={labelClass}>Email</span>
                  <input
                    type="email"
                    className={inputClass}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </label>

                <label className="block space-y-1">
                  <span className={labelClass}>Teléfono/WhatsApp</span>
                  <input className={inputClass} value={telefono} onChange={(e) => setTelefono(e.target.value)} />
                </label>

                <label className="block space-y-1">
                  <span className={labelClass}>Origen</span>
                  <select className={inputClass} value={origen} onChange={(e) => setOrigen(e.target.value)}>
                    <option value="">Sin definir</option>
                    {ORIGEN_OPTIONS.map((o) => (
                      <option key={o} value={o}>
                        {ORIGEN_LABELS[o]}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block space-y-1">
                  <span className={labelClass}>Modelo de interés</span>
                  <select
                    className={inputClass}
                    value={modeloInteres}
                    onChange={(e) => setModeloInteres(e.target.value)}
                  >
                    <option value="">Sin definir</option>
                    {MODELO_INTERES_OPTIONS.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block space-y-1">
                  <span className={labelClass}>Notas iniciales</span>
                  <textarea
                    className={inputClass}
                    rows={3}
                    value={notasVenta}
                    onChange={(e) => setNotasVenta(e.target.value)}
                  />
                </label>

                <label className="block space-y-1">
                  <span className={labelClass}>Vendedor asignado</span>
                  <select
                    className={inputClass}
                    value={vendedorId}
                    onChange={(e) => setVendedorId(e.target.value)}
                  >
                    <option value="">Sin asignar</option>
                    {vendedores.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.nombre}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block space-y-1">
                  <span className={labelClass}>Valor estimado (USD)</span>
                  <input
                    type="number"
                    step="0.01"
                    className={inputClass}
                    value={valorEstimado}
                    onChange={(e) => setValorEstimado(e.target.value)}
                  />
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={cerrar}
                  className="px-4 py-2 text-sm font-bold text-stone-500 hover:text-stone-700"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={crear}
                  className="px-4 py-2 bg-[#2F2F2F] hover:bg-[#1a1a1a] disabled:opacity-50 text-white font-bold text-sm rounded-lg transition-colors"
                >
                  {busy ? "Creando..." : "Crear lead"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
