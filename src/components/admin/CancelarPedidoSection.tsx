"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/admin/Toast";
import { etiquetaEstadoPedido } from "@/lib/pedido/estado-pedido";

/** Cancelar un pedido (con motivo opcional) o reactivarlo si ya está
 * cancelado. Un pedido cancelado no cuenta para el estado del cliente ni se
 * muestra en /mi-pedido. */
export default function CancelarPedidoSection({
  id,
  cancelado,
  motivoCancelacion,
  fechaCancelacion,
  canceladoPor,
  estadoAntesDeCancelar,
}: {
  id: string;
  cancelado: boolean;
  motivoCancelacion: string | null;
  fechaCancelacion: string | null;
  canceladoPor: string | null;
  estadoAntesDeCancelar: string | null;
}) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const { showSuccess, showError } = useToast();

  async function enviar(method: "POST" | "DELETE") {
    setEnviando(true);
    try {
      const res = await fetch(`/api/admin/configuraciones/${id}/cancelar`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: method === "POST" ? JSON.stringify({ motivo: motivo.trim() || null }) : undefined,
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        showError(json?.error ?? "No pudimos guardar el cambio.");
        return;
      }
      showSuccess(method === "POST" ? "Pedido cancelado" : "Pedido reactivado");
      setAbierto(false);
      setMotivo("");
      router.refresh();
    } catch {
      showError("No pudimos guardar el cambio. Probá de nuevo.");
    } finally {
      setEnviando(false);
    }
  }

  if (cancelado) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-5 space-y-2 text-sm">
        <p className="font-bold text-red-700">Pedido cancelado</p>
        <p className="text-red-700/80">
          {fechaCancelacion && `El ${new Date(fechaCancelacion).toLocaleDateString("es-AR")}`}
          {canceladoPor && ` por ${canceladoPor}`}.{" "}
          {motivoCancelacion ? `Motivo: ${motivoCancelacion}` : "Sin motivo cargado."}
        </p>
        <button
          type="button"
          disabled={enviando}
          onClick={() => enviar("DELETE")}
          className="px-4 py-2 rounded-lg border border-red-300 bg-white text-red-700 font-bold hover:bg-red-100 disabled:opacity-60"
        >
          {enviando ? "Reactivando..." : `Reactivar pedido (vuelve a «${etiquetaEstadoPedido(estadoAntesDeCancelar ?? "consulta")}»)`}
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-[#E5E5E5] p-5 space-y-3 text-sm">
      {!abierto ? (
        <button
          type="button"
          onClick={() => setAbierto(true)}
          className="px-4 py-2 rounded-lg border border-red-200 text-red-600 font-bold hover:bg-red-50"
        >
          Cancelar pedido
        </button>
      ) : (
        <>
          <label className="block space-y-1.5">
            <span className="font-medium text-[#2F2F2F]">Motivo (opcional)</span>
            <textarea
              rows={2}
              maxLength={500}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              className="w-full rounded-lg border border-[#E5E5E5] px-3 py-2 text-sm text-[#2F2F2F] bg-white focus:outline-none focus:ring-2 focus:ring-sage-500"
            />
          </label>
          <p className="text-xs text-stone-500">
            El pedido deja de contar para el estado del cliente y el link de seguimiento deja de mostrarlo. Se puede
            reactivar.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={enviando}
              onClick={() => enviar("POST")}
              className="px-4 py-2 rounded-lg bg-red-600 text-white font-bold hover:bg-red-700 disabled:opacity-60"
            >
              {enviando ? "Cancelando..." : "Confirmar cancelación"}
            </button>
            <button
              type="button"
              disabled={enviando}
              onClick={() => setAbierto(false)}
              className="px-4 py-2 rounded-lg border border-[#E5E5E5] text-stone-600 hover:bg-stone-50"
            >
              Volver
            </button>
          </div>
        </>
      )}
    </div>
  );
}
