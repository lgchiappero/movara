"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { estadoFabricacionLabels, type EstadoFabricacion } from "@/lib/envios/constantes";

type Unidad = {
  id: string;
  numeroUnidad: string | null;
  clienteNombre: string;
  modelo: string | null;
  estadoFabricacion: string;
};

export default function UnidadEnvioRow({ unidad }: { unidad: Unidad }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function quitar() {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/unidades/${unidad.id}/envio`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ envioId: null }),
      });
      if (res.ok) router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center justify-between gap-3 text-sm py-2 px-3 rounded-lg border border-[#F0F0F0]">
      <Link href={`/admin/unidades/${unidad.id}`} className="min-w-0 hover:underline">
        <span className="font-medium text-[#2F2F2F]">{unidad.numeroUnidad ?? "Sin número"}</span>
        <span className="text-stone-400 ml-2">{unidad.clienteNombre}</span>
        <span className="text-stone-400 ml-2">{unidad.modelo ?? "Modelo sin definir"}</span>
      </Link>
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="px-2 py-1 rounded-full text-xs font-bold bg-stone-100 text-stone-600">
          {estadoFabricacionLabels[unidad.estadoFabricacion as EstadoFabricacion] ?? unidad.estadoFabricacion}
        </span>
        <button
          type="button"
          disabled={busy}
          onClick={quitar}
          className="px-2.5 py-1 rounded-full text-xs font-bold bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-50 transition-colors"
        >
          {busy ? "Quitando..." : "Quitar"}
        </button>
      </div>
    </div>
  );
}
