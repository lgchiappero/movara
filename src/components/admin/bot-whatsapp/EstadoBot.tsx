"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/admin/Toast";
import type { GastoMes } from "@/lib/bot-whatsapp/config";
import { llamarApi } from "./api";

const COLOR_BARRA = { normal: "bg-[#D4B36A]", aviso: "bg-amber-400", tope: "bg-red-500" } as const;

/** Interruptor del bot (solo administrador) y gasto del mes contra el tope. */
export default function EstadoBot({ activo, gasto, esAdmin }: { activo: boolean; gasto: GastoMes; esAdmin: boolean }) {
  const [encendido, setEncendido] = useState(activo);
  const [guardando, setGuardando] = useState(false);
  const toast = useToast();
  const router = useRouter();

  async function alternar() {
    const nuevo = !encendido;
    setGuardando(true);
    try {
      await llamarApi("/api/admin/bot-whatsapp/config", "PATCH", { activo: nuevo });
      setEncendido(nuevo);
      toast.showSuccess(nuevo ? "Bot activo: va a responder a los clientes." : "Bot pausado: no responde a nadie.");
      router.refresh();
    } catch (err) {
      toast.showError((err as Error).message);
    } finally {
      setGuardando(false);
    }
  }

  const porcentaje = Math.min(100, Math.round(gasto.porcentaje * 100));

  return (
    <section aria-labelledby="estado-bot" className="grid gap-4 sm:grid-cols-2">
      <div className="rounded-2xl bg-[#1A1A1A] p-5 text-white">
        <h2 id="estado-bot" className="text-xs font-bold uppercase tracking-widest text-[#D4B36A]">Estado</h2>
        <div className="mt-3 flex items-center justify-between gap-4">
          <p className="text-xl font-bold" aria-live="polite">
            {encendido ? "Bot activo" : "Bot pausado"}
          </p>
          <button
            type="button"
            role="switch"
            aria-checked={encendido}
            aria-label={encendido ? "Pausar el bot" : "Activar el bot"}
            disabled={!esAdmin || guardando}
            onClick={alternar}
            className={`relative inline-flex h-11 w-20 shrink-0 items-center rounded-full border-2 transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
              encendido ? "border-[#D4B36A] bg-[#D4B36A]" : "border-stone-500 bg-stone-700"
            }`}
          >
            <span
              className={`inline-block h-8 w-8 rounded-full bg-white shadow transition-transform ${encendido ? "translate-x-10" : "translate-x-1"}`}
            />
          </button>
        </div>
        <p className="mt-2 text-xs text-stone-400">
          {esAdmin
            ? encendido
              ? "Responde a los clientes nuevos por WhatsApp."
              : "No responde a nadie. Se activa recién cuando lo prendas."
            : "Solo un administrador puede prenderlo o pausarlo."}
        </p>
      </div>

      <div className="rounded-2xl border border-[#E5E5E5] bg-white p-5">
        <h2 className="text-xs font-bold uppercase tracking-widest text-stone-500">Gasto del mes</h2>
        <p className="mt-3 text-xl font-bold text-[#1A1A1A]">
          USD {gasto.costoUsd.toFixed(2)} <span className="text-base font-medium text-stone-500">de USD {gasto.topeUsd.toFixed(2)}</span>
        </p>
        <div
          role="progressbar"
          aria-label="Gasto del mes"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={porcentaje}
          data-nivel={gasto.nivel}
          className="mt-3 h-3 w-full overflow-hidden rounded-full bg-stone-100"
        >
          <div className={`h-full rounded-full ${COLOR_BARRA[gasto.nivel]}`} style={{ width: `${porcentaje}%` }} />
        </div>
        <p className="mt-2 text-xs text-stone-500">
          {gasto.nivel === "tope"
            ? "Llegó al tope mensual."
            : gasto.nivel === "aviso"
              ? "Pasó el 80 % del tope."
              : `${porcentaje} % del tope mensual.`}
        </p>
      </div>
    </section>
  );
}
