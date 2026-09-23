"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MODELOS_UNIDAD } from "@/lib/envios/constantes";

const inputClass =
  "w-full rounded-lg border border-[#E5E5E5] px-3 py-2 text-sm text-[#1a1a1a] bg-white focus:outline-none focus:ring-2 focus:ring-[#D4B06A]";

type Cliente = { id: string; nombre: string };
type Envio = { id: string; numeroPI: string | null };

export default function NuevaUnidadForm({ clientes, envios }: { clientes: Cliente[]; envios: Envio[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [clienteId, setClienteId] = useState("");
  const [envioId, setEnvioId] = useState("");
  const [modelo, setModelo] = useState("");
  const [precioCliente, setPrecioCliente] = useState("");
  const [notas, setNotas] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function crear() {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/admin/unidades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clienteId,
          envioId: envioId || undefined,
          modelo: modelo || undefined,
          precioCliente: precioCliente.trim() ? Number(precioCliente) : undefined,
          notas: notas.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "No pudimos crear la unidad.");
        return;
      }
      router.push(`/admin/unidades/${json.id}`);
    } catch {
      setError("No pudimos crear la unidad. Probá de nuevo.");
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
        + Nueva unidad
      </button>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-[#E5E5E5] p-5 space-y-4 w-full max-w-md">
      <h2 className="text-sm font-bold uppercase tracking-widest text-stone-500">Nueva unidad</h2>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="block space-y-1.5 sm:col-span-2">
          <span className="text-xs font-medium text-stone-500">Cliente *</span>
          <select className={inputClass} value={clienteId} onChange={(e) => setClienteId(e.target.value)}>
            <option value="">Elegí un cliente</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
          {clientes.length === 0 && (
            <span className="text-xs text-stone-400">No hay clientes cargados todavía — creá uno primero.</span>
          )}
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-stone-500">Modelo</span>
          <select className={inputClass} value={modelo} onChange={(e) => setModelo(e.target.value)}>
            <option value="">Sin definir</option>
            {MODELOS_UNIDAD.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-stone-500">Envío</span>
          <select className={inputClass} value={envioId} onChange={(e) => setEnvioId(e.target.value)}>
            <option value="">Sin asignar</option>
            {envios.map((e) => (
              <option key={e.id} value={e.id}>
                {e.numeroPI ?? `Envío ${e.id.slice(-6)}`}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-stone-500">Precio cliente (USD)</span>
          <input
            type="number"
            step="0.01"
            className={inputClass}
            value={precioCliente}
            onChange={(e) => setPrecioCliente(e.target.value)}
          />
        </label>
        <label className="block space-y-1.5 sm:col-span-2">
          <span className="text-xs font-medium text-stone-500">Notas</span>
          <textarea className={inputClass} rows={2} value={notas} onChange={(e) => setNotas(e.target.value)} />
        </label>
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          disabled={busy || !clienteId}
          onClick={crear}
          className="px-5 py-2.5 bg-[#D4B06A] hover:bg-[#c19f5a] disabled:opacity-50 text-[#1a1a1a] font-bold text-sm rounded-xl transition-colors"
        >
          {busy ? "Creando..." : "Crear unidad"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="px-5 py-2.5 border border-stone-300 text-stone-600 hover:bg-stone-50 font-medium text-sm rounded-xl transition-colors"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
