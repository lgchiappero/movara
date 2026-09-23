"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NuevoEnvioButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function crear() {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/admin/envios", { method: "POST" });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "No pudimos crear el envío.");
        return;
      }
      router.push(`/admin/envios/${json.id}`);
    } catch {
      setError("No pudimos crear el envío. Probá de nuevo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="text-right">
      <button
        type="button"
        disabled={busy}
        onClick={crear}
        className="px-5 py-3 bg-[#D4B06A] hover:bg-[#c19f5a] disabled:opacity-50 text-[#1a1a1a] font-bold text-sm rounded-xl transition-colors"
      >
        {busy ? "Creando..." : "+ Nuevo envío"}
      </button>
      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
    </div>
  );
}
