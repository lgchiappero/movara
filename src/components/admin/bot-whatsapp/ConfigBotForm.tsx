"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/admin/Toast";
import {
  DIAS,
  ETIQUETA_MODO_RESPALDO,
  MODOS_RESPALDO,
  NOMBRE_DIA,
  type HorarioAtencion,
  type ModoRespaldo,
} from "@/lib/bot-whatsapp/constantes";
import { formatearTelefonoWhatsapp } from "@/lib/bot-whatsapp/telefono";
import { llamarApi } from "./api";

export type ConfigEditable = {
  modoHorario: boolean;
  horarioAtencion: HorarioAtencion;
  modoRespaldo: ModoRespaldo;
  mensajeBienvenida: string;
  topeGastoMensualUsd: number;
  emailAviso: string | null;
  whatsappAviso: string | null;
  maxRespuestasPorLead: number;
};

const input =
  "w-full rounded-lg border border-[#E5E5E5] bg-white px-3 py-2.5 text-base sm:text-sm text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#D4B36A]";
const label = "block text-sm font-medium text-[#1A1A1A]";

/** Configuración del bot (solo administrador; el servidor también lo exige). */
export default function ConfigBotForm({ inicial }: { inicial: ConfigEditable }) {
  const [c, setC] = useState<ConfigEditable>(inicial);
  const [whatsapp, setWhatsapp] = useState(inicial.whatsappAviso ? formatearTelefonoWhatsapp(inicial.whatsappAviso) : "");
  const [guardando, setGuardando] = useState(false);
  const toast = useToast();
  const router = useRouter();

  const set = <K extends keyof ConfigEditable>(k: K, v: ConfigEditable[K]) => setC((prev) => ({ ...prev, [k]: v }));

  function cambiarFranja(dia: keyof HorarioAtencion, i: number, campo: "desde" | "hasta", valor: string) {
    set("horarioAtencion", {
      ...c.horarioAtencion,
      [dia]: c.horarioAtencion[dia].map((f, j) => (j === i ? { ...f, [campo]: valor } : f)),
    });
  }

  function alternarDia(dia: keyof HorarioAtencion) {
    set("horarioAtencion", {
      ...c.horarioAtencion,
      [dia]: c.horarioAtencion[dia].length ? [] : [{ desde: "09:00", hasta: "18:00" }],
    });
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setGuardando(true);
    try {
      await llamarApi("/api/admin/bot-whatsapp/config", "PATCH", { ...c, whatsappAviso: whatsapp.trim() || null });
      toast.showSuccess("Configuración guardada");
      router.refresh();
    } catch (err) {
      toast.showError((err as Error).message);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <form onSubmit={guardar} aria-label="Configuración del bot" className="space-y-6 rounded-2xl border border-[#E5E5E5] bg-white p-5">
      <fieldset className="space-y-3">
        <legend className="text-sm font-bold text-[#1A1A1A]">Horario de atención</legend>
        <label className="flex min-h-11 items-center gap-3 text-sm text-[#1A1A1A]">
          <input type="checkbox" className="h-5 w-5 accent-[#D4B36A]" checked={c.modoHorario} onChange={(e) => set("modoHorario", e.target.checked)} />
          Responder solo fuera del horario de atención
        </label>
        <p className="text-xs text-stone-500">Hora de Córdoba. Un día sin tildar es un día sin atención.</p>
        <div className="divide-y divide-stone-100 rounded-xl border border-stone-100">
          {DIAS.map((dia) => {
            const franjas = c.horarioAtencion[dia];
            return (
              <div key={dia} className="flex flex-wrap items-center gap-3 px-3 py-2">
                <label className="flex min-h-11 w-32 items-center gap-2 text-sm font-medium text-[#1A1A1A]">
                  <input type="checkbox" className="h-5 w-5 accent-[#D4B36A]" checked={franjas.length > 0} onChange={() => alternarDia(dia)} />
                  {NOMBRE_DIA[dia]}
                </label>
                {franjas.length === 0 ? (
                  <span className="text-sm text-stone-400">Cerrado</span>
                ) : (
                  franjas.map((f, i) => (
                    <span key={i} className="flex items-center gap-2 text-sm text-stone-600">
                      <input
                        type="time"
                        aria-label={`${NOMBRE_DIA[dia]}: desde`}
                        className={`${input} w-28`}
                        value={f.desde}
                        onChange={(e) => cambiarFranja(dia, i, "desde", e.target.value)}
                      />
                      a
                      <input
                        type="time"
                        aria-label={`${NOMBRE_DIA[dia]}: hasta`}
                        className={`${input} w-28`}
                        value={f.hasta}
                        onChange={(e) => cambiarFranja(dia, i, "hasta", e.target.value)}
                      />
                    </span>
                  ))
                )}
              </div>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="text-sm font-bold text-[#1A1A1A]">Si se alcanza el tope de gasto</legend>
        <select
          aria-label="Si se alcanza el tope de gasto"
          className={input}
          value={c.modoRespaldo}
          onChange={(e) => set("modoRespaldo", e.target.value as ModoRespaldo)}
        >
          {MODOS_RESPALDO.map((m) => (
            <option key={m} value={m}>
              {ETIQUETA_MODO_RESPALDO[m]}
            </option>
          ))}
        </select>
        <p className="text-xs text-stone-500">Con el bot pausado no responde nada: solo guarda los mensajes.</p>
        <label className={label}>
          Mensaje de bienvenida
          <textarea
            className={`${input} mt-1.5`}
            rows={4}
            maxLength={1000}
            value={c.mensajeBienvenida}
            onChange={(e) => set("mensajeBienvenida", e.target.value)}
          />
        </label>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className={label}>
          Tope de gasto mensual (USD)
          <input
            type="number"
            min={0}
            max={1000}
            step="0.5"
            className={`${input} mt-1.5`}
            value={c.topeGastoMensualUsd}
            onChange={(e) => set("topeGastoMensualUsd", Number(e.target.value))}
          />
        </label>
        <label className={label}>
          Máximo de respuestas del bot por lead
          <input
            type="number"
            min={1}
            max={50}
            className={`${input} mt-1.5`}
            value={c.maxRespuestasPorLead}
            onChange={(e) => set("maxRespuestasPorLead", Number(e.target.value))}
          />
        </label>
        <label className={label}>
          Email de aviso (lead calificado o derivado)
          <input
            type="email"
            className={`${input} mt-1.5`}
            value={c.emailAviso ?? ""}
            onChange={(e) => set("emailAviso", e.target.value || null)}
          />
        </label>
        <label className={label}>
          WhatsApp de aviso
          <input
            type="tel"
            className={`${input} mt-1.5`}
            placeholder="+54 9 3493 66-7214"
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
          />
        </label>
      </div>

      <button
        type="submit"
        disabled={guardando}
        className="min-h-11 w-full rounded-xl bg-[#D4B36A] px-6 text-sm font-bold text-[#1A1A1A] transition-colors hover:bg-[#c1a25a] disabled:opacity-50 sm:w-auto"
      >
        {guardando ? "Guardando…" : "Guardar configuración"}
      </button>
    </form>
  );
}
