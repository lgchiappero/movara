"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { TextoRecibo } from "@/lib/recibos/texto";
import TextoReciboCard from "./TextoReciboCard";
import ReciboConfirmadoVista, { type DatosConfirmado } from "./ReciboConfirmadoVista";
import { serif } from "./estilos";

/** Recibo pendiente: texto + botón. La confirmación es solo este POST
 * explícito — abrir la página no confirma nada. */
export default function ReciboPendienteVista({
  token,
  texto,
  confirmado: base,
}: {
  token: string;
  texto: TextoRecibo;
  /** Datos para la vista confirmada (sin fecha ni hash: los da el server). */
  confirmado: Omit<DatosConfirmado, "confirmadoTexto" | "garantiaHastaTexto" | "hashAbreviado">;
}) {
  const router = useRouter();
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listo, setListo] = useState<DatosConfirmado | null>(null);

  async function confirmar() {
    setEnviando(true);
    setError(null);
    try {
      const res = await fetch(`/api/recibos/${token}/confirmar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmo: true }),
      });
      const json = await res.json().catch(() => null);
      if (res.status === 409) {
        // Ya estaba confirmado (otra pestaña, doble click): mostrar el estado real.
        router.refresh();
        return;
      }
      if (!res.ok) {
        setError(json?.error ?? "No pudimos registrar la confirmación. Probá de nuevo.");
        return;
      }
      setListo({
        ...base,
        confirmadoTexto: json.confirmadoTexto,
        garantiaHastaTexto: json.garantiaHastaTexto,
        hashAbreviado: json.hashAbreviado,
      });
    } catch {
      setError("No pudimos conectarnos. Revisá tu conexión y probá de nuevo.");
    } finally {
      setEnviando(false);
    }
  }

  if (listo) return <ReciboConfirmadoVista d={listo} />;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-[1.65rem] leading-tight text-stone-50" style={serif}>
          Recibo en Conformidad de Entrega
        </h1>
        <div className="mx-auto mt-4 h-px w-12 bg-[#D4B36A]" />
      </div>

      <TextoReciboCard texto={texto} />

      <div className="space-y-3">
        {error && (
          <p role="alert" className="text-sm text-red-300 text-center">
            {error}
          </p>
        )}
        <button
          type="button"
          onClick={confirmar}
          disabled={enviando}
          className="w-full py-4 rounded-xl bg-[#D4B36A] hover:bg-[#c9a65b] disabled:opacity-60 text-[#1A1A1A] font-bold text-[15px] transition-colors"
        >
          {enviando ? "Confirmando..." : "Confirmar recepción en conformidad"}
        </button>
        <p className="text-center text-xs text-stone-500">Al confirmar se registran la fecha, la hora y el dispositivo.</p>
      </div>
    </div>
  );
}
