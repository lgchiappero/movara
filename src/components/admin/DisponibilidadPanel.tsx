"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { HORARIOS_AGENDA } from "@/lib/agenda/horarios";

export type DiaDisponibilidad = {
  fechaKey: string;
  habilitada: boolean;
  horarios: string[];
};

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];
const DIAS_SEMANA = ["L", "M", "M", "J", "V", "S", "D"];

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function hoyFechaKeyLocal() {
  const now = new Date();
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
}

function MesGrid({
  anio,
  mesIdx0,
  mapa,
  onDiaClick,
  onHabilitarMes,
  busy,
}: {
  anio: number;
  mesIdx0: number;
  mapa: Map<string, DiaDisponibilidad>;
  onDiaClick: (key: string) => void;
  onHabilitarMes: (anio: number, mes1: number) => void;
  busy: boolean;
}) {
  const primerDiaSemana = (new Date(Date.UTC(anio, mesIdx0, 1)).getUTCDay() + 6) % 7;
  const diasEnMes = new Date(Date.UTC(anio, mesIdx0 + 1, 0)).getUTCDate();
  const hoy = hoyFechaKeyLocal();

  return (
    <div className="bg-white rounded-2xl border border-[#E5E5E5] p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="font-bold text-[#2F2F2F]">
          {MESES[mesIdx0]} {anio}
        </p>
        <button
          type="button"
          disabled={busy}
          onClick={() => onHabilitarMes(anio, mesIdx0 + 1)}
          className="text-xs font-bold px-3 py-1.5 rounded-full bg-[#D4B06A] hover:bg-[#c19f5a] disabled:opacity-50 text-[#2F2F2F] transition-colors"
        >
          Habilitar mes completo
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-stone-400 font-medium mb-1">
        {DIAS_SEMANA.map((d, i) => (
          <div key={i}>{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: primerDiaSemana }).map((_, i) => (
          <div key={`vacio-${i}`} />
        ))}
        {Array.from({ length: diasEnMes }, (_, i) => i + 1).map((dia) => {
          const key = `${anio}-${pad2(mesIdx0 + 1)}-${pad2(dia)}`;
          const info = mapa.get(key);
          const habilitado = info?.habilitada && info.horarios.length > 0;
          const esPasado = key < hoy;
          return (
            <button
              key={dia}
              type="button"
              disabled={esPasado}
              onClick={() => onDiaClick(key)}
              className={`aspect-square rounded-lg text-xs font-medium transition-colors ${
                esPasado
                  ? "bg-stone-50 text-stone-300 cursor-not-allowed"
                  : habilitado
                    ? "bg-[#D4B06A]/25 text-[#8a6a2e] hover:bg-[#D4B06A]/40"
                    : "bg-stone-100 text-stone-400 hover:bg-stone-200"
              }`}
              title={habilitado ? `${info!.horarios.length} horarios` : "Sin disponibilidad"}
            >
              {dia}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function DisponibilidadPanel({
  anioInicial,
  mesInicial,
  disponibilidad,
}: {
  anioInicial: number;
  mesInicial: number;
  disponibilidad: DiaDisponibilidad[];
}) {
  const router = useRouter();
  const [mapa, setMapa] = useState(() => {
    const m = new Map<string, DiaDisponibilidad>();
    for (const d of disponibilidad) m.set(d.fechaKey, d);
    return m;
  });
  const [diaEditando, setDiaEditando] = useState<string | null>(null);
  const [horariosEdit, setHorariosEdit] = useState<Set<string>>(new Set());
  const [habilitadaEdit, setHabilitadaEdit] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function abrirDia(key: string) {
    const info = mapa.get(key);
    setDiaEditando(key);
    setHabilitadaEdit(info?.habilitada ?? true);
    setHorariosEdit(new Set(info?.horarios ?? []));
    setError(null);
  }

  async function guardarDia(key: string, habilitada: boolean, horarios: string[]) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/agenda/disponibilidad", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fecha: key, habilitada, horarios }),
      });
      if (!res.ok) throw new Error("request-failed");
      setMapa((prev) => new Map(prev).set(key, { fechaKey: key, habilitada, horarios }));
      setDiaEditando(null);
      router.refresh();
    } catch {
      setError("No pudimos guardar la disponibilidad. Probá de nuevo.");
    } finally {
      setBusy(false);
    }
  }

  async function habilitarMesCompleto(anio: number, mes1: number) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/agenda/disponibilidad/mes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ anio, mes: mes1 }),
      });
      if (!res.ok) throw new Error("request-failed");
      router.refresh();
    } catch {
      setError("No pudimos habilitar el mes. Probá de nuevo.");
    } finally {
      setBusy(false);
    }
  }

  const meses = [0, 1, 2].map((offset) => {
    const total = mesInicial + offset;
    return { anio: anioInicial + Math.floor(total / 12), mesIdx0: total % 12 };
  });

  return (
    <div className="space-y-4">
      {error && <p className="text-xs text-red-600">{error}</p>}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {meses.map(({ anio, mesIdx0 }) => (
          <MesGrid
            key={`${anio}-${mesIdx0}`}
            anio={anio}
            mesIdx0={mesIdx0}
            mapa={mapa}
            onDiaClick={abrirDia}
            onHabilitarMes={habilitarMesCompleto}
            busy={busy}
          />
        ))}
      </div>

      {diaEditando && (
        <div className="bg-white rounded-2xl border border-[#D4B06A] p-5 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-widest text-stone-400">
              {diaEditando}
            </p>
            <button
              type="button"
              onClick={() => setDiaEditando(null)}
              className="text-stone-400 hover:text-stone-600 text-sm"
            >
              ✕
            </button>
          </div>

          <label className="flex items-center gap-2 text-sm text-[#2F2F2F]">
            <input
              type="checkbox"
              checked={habilitadaEdit}
              onChange={(e) => setHabilitadaEdit(e.target.checked)}
            />
            Día habilitado
          </label>

          {habilitadaEdit && (
            <div className="grid grid-cols-3 gap-2">
              {HORARIOS_AGENDA.map((h) => {
                const activo = horariosEdit.has(h);
                return (
                  <label
                    key={h}
                    className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium border cursor-pointer ${
                      activo ? "border-[#D4B06A] bg-[#D4B06A]/10 text-[#8a6a2e]" : "border-[#E5E5E5] text-stone-500"
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={activo}
                      onChange={(e) => {
                        setHorariosEdit((prev) => {
                          const next = new Set(prev);
                          if (e.target.checked) next.add(h);
                          else next.delete(h);
                          return next;
                        });
                      }}
                    />
                    {h}
                  </label>
                );
              })}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              disabled={busy}
              onClick={() => guardarDia(diaEditando, habilitadaEdit, Array.from(horariosEdit))}
              className="px-4 py-2 bg-[#D4B06A] hover:bg-[#c19f5a] disabled:opacity-50 text-[#2F2F2F] font-bold text-xs rounded-xl transition-colors"
            >
              Guardar
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => guardarDia(diaEditando, false, [])}
              className="px-4 py-2 border border-red-300 text-red-600 hover:bg-red-50 disabled:opacity-50 font-bold text-xs rounded-xl transition-colors"
            >
              Deshabilitar día
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
