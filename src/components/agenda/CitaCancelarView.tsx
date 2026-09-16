"use client";

import { useState } from "react";
import { SHOWROOM_DIRECCION } from "@/lib/agenda/showroom";

export type CitaCancelarData = {
  id: string;
  nombre: string;
  fechaEs: string;
  horario: string;
  estado: string;
};

const ESTADO_LABEL: Record<string, string> = {
  confirmada: "Confirmada",
  cancelada: "Cancelada",
  completada: "Completada",
};

export default function CitaCancelarView({ cita }: { cita: CitaCancelarData }) {
  const [estado, setEstado] = useState(cita.estado);
  const [accion, setAccion] = useState<"idle" | "cancelando" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function cancelar() {
    if (!window.confirm("¿Seguro que querés cancelar tu visita?")) return;
    setAccion("cancelando");
    setError(null);
    try {
      const res = await fetch(`/api/agenda/citas/${cita.id}/cancelar`, { method: "POST" });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setError(json?.error ?? "No pudimos cancelar tu visita.");
        setAccion("error");
        return;
      }
      setEstado("cancelada");
    } catch {
      setError("No pudimos cancelar tu visita. Probá de nuevo.");
      setAccion("error");
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-[#E5E5E5] p-5 space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-stone-500">Nombre</span>
          <span className="text-[#2F2F2F] font-medium">{cita.nombre}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-stone-500">Fecha</span>
          <span className="text-[#2F2F2F] font-medium">{cita.fechaEs}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-stone-500">Horario</span>
          <span className="text-[#2F2F2F] font-medium">{cita.horario} hs</span>
        </div>
        <div className="flex justify-between">
          <span className="text-stone-500">Dónde</span>
          <span className="text-[#2F2F2F] font-medium">{SHOWROOM_DIRECCION}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-stone-500">Estado</span>
          <span className="text-[#2F2F2F] font-medium">{ESTADO_LABEL[estado] ?? estado}</span>
        </div>
      </div>

      {estado === "confirmada" && (
        <div className="space-y-3">
          {error && <p className="text-xs text-red-600">{error}</p>}
          <button
            type="button"
            disabled={accion === "cancelando"}
            onClick={cancelar}
            className="w-full py-3 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold text-sm rounded-xl transition-colors"
          >
            {accion === "cancelando" ? "Cancelando..." : "Cancelar mi visita"}
          </button>
        </div>
      )}

      {estado === "cancelada" && (
        <div className="bg-white rounded-2xl border border-[#E5E5E5] p-6 text-center">
          <p className="text-3xl mb-2">✅</p>
          <p className="font-bold text-[#2F2F2F] mb-1">Tu visita fue cancelada</p>
          <p className="text-sm text-stone-500">Te enviamos un email confirmándolo.</p>
        </div>
      )}

      {estado === "completada" && (
        <div className="bg-stone-50 rounded-2xl border border-[#E5E5E5] p-6 text-center">
          <p className="text-sm text-stone-500">Esta visita ya se realizó.</p>
        </div>
      )}
    </div>
  );
}
