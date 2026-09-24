"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type UnidadDisponible = { id: string; numeroUnidad: string | null; clienteNombre: string };

export default function AgregarUnidadSelector({
  envioId,
  unidadesDisponibles,
}: {
  envioId: string;
  unidadesDisponibles: UnidadDisponible[];
}) {
  const router = useRouter();
  const [unidadId, setUnidadId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function agregar() {
    if (!unidadId) return;
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/unidades/${unidadId}/envio`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ envioId }),
      });
      if (!res.ok) throw new Error("request-failed");
      setUnidadId("");
      router.refresh();
    } catch {
      setError("No pudimos agregar la unidad. Probá de nuevo.");
    } finally {
      setBusy(false);
    }
  }

  if (unidadesDisponibles.length === 0) {
    return <p className="text-xs text-stone-400">No hay unidades sin envío asignado para agregar.</p>;
  }

  return (
    <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
      <select
        className="flex-1 rounded-lg border border-[#E5E5E5] px-3 py-2 text-sm text-[#2F2F2F] bg-white"
        value={unidadId}
        onChange={(e) => setUnidadId(e.target.value)}
      >
        <option value="">Elegí una unidad sin envío asignado</option>
        {unidadesDisponibles.map((u) => (
          <option key={u.id} value={u.id}>
            {u.numeroUnidad ?? "Sin número"} · {u.clienteNombre}
          </option>
        ))}
      </select>
      <button
        type="button"
        disabled={busy || !unidadId}
        onClick={agregar}
        className="px-4 py-2 bg-sage-500 hover:bg-sage-600 disabled:opacity-60 text-[#2F2F2F] font-bold text-xs rounded-lg transition-colors whitespace-nowrap"
      >
        {busy ? "Agregando..." : "+ Agregar unidad"}
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
