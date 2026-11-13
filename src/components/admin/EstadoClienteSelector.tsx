"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/admin/Toast";
import {
  ESTADO_CLIENTE_OPTIONS,
  ESTADO_CLIENTE_LABELS,
  ESTADO_CLIENTE_COLORS,
  esEstadoCliente,
} from "@/lib/clientes/estado";
import { formatearFechaAR } from "@/lib/fecha-ar";

/** Estado del cliente en la ficha: selector para fijarlo a mano y botón para
 * volver al cálculo automático. */
export default function EstadoClienteSelector({
  id,
  estado,
  estadoManual,
  estadoManualEn,
  estadoManualPor,
  estadoAutomatico,
}: {
  id: string;
  estado: string;
  estadoManual: boolean;
  estadoManualEn: string | null;
  estadoManualPor: string | null;
  estadoAutomatico: string;
}) {
  const router = useRouter();
  const [guardando, setGuardando] = useState(false);
  const { showSuccess, showError } = useToast();

  async function enviar(body: { estado: string } | { automatico: true }) {
    setGuardando(true);
    try {
      const res = await fetch(`/api/admin/clientes/${id}/estado`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        showError(json?.error ?? "No pudimos guardar el estado.");
        return;
      }
      showSuccess("estado" in body ? "Estado guardado (manual)" : "Estado automático");
      router.refresh();
    } catch {
      showError("No pudimos guardar el estado. Probá de nuevo.");
    } finally {
      setGuardando(false);
    }
  }

  const color = esEstadoCliente(estado) ? ESTADO_CLIENTE_COLORS[estado] : ESTADO_CLIENTE_COLORS.interesado;

  return (
    <div className="bg-white rounded-2xl border border-[#E5E5E5] p-5 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-bold uppercase tracking-widest text-sage-600">Estado</h2>
        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${color}`}>
          {esEstadoCliente(estado) ? ESTADO_CLIENTE_LABELS[estado] : estado}
          {estadoManual && " · manual"}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm">
          <span className="text-stone-500">Cambiar a mano:</span>
          <select
            aria-label="Estado del cliente"
            value={estado}
            disabled={guardando}
            onChange={(e) => enviar({ estado: e.target.value })}
            className="rounded-lg border border-[#E5E5E5] px-3 py-2 text-sm text-[#2F2F2F] bg-white"
          >
            {ESTADO_CLIENTE_OPTIONS.map((o) => (
              <option key={o} value={o}>
                {ESTADO_CLIENTE_LABELS[o]}
              </option>
            ))}
          </select>
        </label>
        {estadoManual && (
          <button
            type="button"
            disabled={guardando}
            onClick={() => enviar({ automatico: true })}
            className="px-3 py-2 rounded-lg border border-[#E5E5E5] text-sm font-medium text-stone-600 hover:bg-stone-50 disabled:opacity-60"
          >
            Volver a automático
          </button>
        )}
      </div>
      {estadoManual ? (
        <p className="text-xs text-stone-500">
          Fijado a mano
          {estadoManualPor && ` por ${estadoManualPor}`}
          {estadoManualEn && ` el ${formatearFechaAR(estadoManualEn)}`}. Por los pedidos
          correspondería «{esEstadoCliente(estadoAutomatico) ? ESTADO_CLIENTE_LABELS[estadoAutomatico] : estadoAutomatico}»; si
          avanzan más allá del manual, se actualiza solo.
        </p>
      ) : (
        <p className="text-xs text-stone-500">Automático: el del pedido más avanzado del cliente.</p>
      )}
    </div>
  );
}
