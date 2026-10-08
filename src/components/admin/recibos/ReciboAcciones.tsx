"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** Reenviar email y Anular (este último solo lo recibe el rol admin). */
export default function ReciboAcciones({
  id,
  estado,
  puedeAnular,
}: {
  id: string;
  estado: string;
  puedeAnular: boolean;
}) {
  const router = useRouter();
  const [ocupado, setOcupado] = useState<"reenviar" | "anular" | null>(null);
  const [mensaje, setMensaje] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);

  async function llamar(accion: "reenviar" | "anular") {
    if (accion === "anular" && !window.confirm("¿Anular este recibo? El link que recibió el cliente deja de funcionar.")) return;
    setOcupado(accion);
    setMensaje(null);
    try {
      const res =
        accion === "reenviar"
          ? await fetch(`/api/admin/recibos/${id}/reenviar`, { method: "POST" })
          : await fetch(`/api/admin/recibos/${id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ accion: "anular" }),
            });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setMensaje({ tipo: "error", texto: json?.error ?? "No se pudo completar la acción." });
        return;
      }
      setMensaje({ tipo: "ok", texto: accion === "reenviar" ? "Email reenviado al cliente." : "Recibo anulado." });
      router.refresh();
    } catch {
      setMensaje({ tipo: "error", texto: "No se pudo completar la acción. Probá de nuevo." });
    } finally {
      setOcupado(null);
    }
  }

  if (estado !== "pendiente") return null;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => llamar("reenviar")}
          disabled={ocupado !== null}
          className="px-3 py-1.5 border border-[#E5E5E5] bg-white hover:bg-stone-50 disabled:opacity-50 text-[#2F2F2F] font-semibold text-sm rounded-lg"
        >
          {ocupado === "reenviar" ? "Enviando..." : "Reenviar email"}
        </button>
        {puedeAnular && (
          <button
            type="button"
            onClick={() => llamar("anular")}
            disabled={ocupado !== null}
            className="px-3 py-1.5 border border-red-200 bg-white hover:bg-red-50 disabled:opacity-50 text-red-700 font-semibold text-sm rounded-lg"
          >
            {ocupado === "anular" ? "Anulando..." : "Anular"}
          </button>
        )}
      </div>
      {mensaje && (
        <p role="status" className={`text-sm ${mensaje.tipo === "ok" ? "text-green-700" : "text-red-600"}`}>
          {mensaje.texto}
        </p>
      )}
    </div>
  );
}
