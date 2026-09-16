"use client";

import { useState } from "react";

export default function CancelarCitaButton({ id }: { id: string }) {
  const [estado, setEstado] = useState<"idle" | "cancelando" | "cancelada" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function cancelar() {
    if (!window.confirm("¿Seguro que querés cancelar tu visita?")) return;
    setEstado("cancelando");
    setError(null);
    try {
      const res = await fetch(`/api/agenda/citas/${id}/cancelar`, { method: "POST" });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setError(json?.error ?? "No pudimos cancelar tu visita.");
        setEstado("error");
        return;
      }
      setEstado("cancelada");
    } catch {
      setError("No pudimos cancelar tu visita. Probá de nuevo.");
      setEstado("error");
    }
  }

  if (estado === "cancelada") {
    return (
      <div className="bg-white rounded-2xl border border-[#E5E5E5] p-6 text-center">
        <p className="text-3xl mb-2">✅</p>
        <p className="font-bold text-[#2F2F2F] mb-1">Tu visita fue cancelada</p>
        <p className="text-sm text-stone-500">Te enviamos un email confirmándolo.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error && <p className="text-xs text-red-600">{error}</p>}
      <button
        type="button"
        disabled={estado === "cancelando"}
        onClick={cancelar}
        className="w-full py-3 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold text-sm rounded-xl transition-colors"
      >
        {estado === "cancelando" ? "Cancelando..." : "Cancelar mi visita"}
      </button>
    </div>
  );
}
