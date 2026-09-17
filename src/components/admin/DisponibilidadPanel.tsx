"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { HORARIOS_AGENDA, esDiaHabil } from "@/lib/agenda/horarios";

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

function esDomingoKey(key: string): boolean {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay() === 0;
}

function fechaEsDesdeKey(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("es-AR", {
    timeZone: "UTC",
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

type EstadoVisual = "pasado" | "con-citas" | "sin-citas" | "domingo" | "deshabilitado";

function estadoVisualDia(
  key: string,
  info: DiaDisponibilidad | undefined,
  tieneCitas: boolean,
  hoy: string
): EstadoVisual {
  if (key < hoy) return "pasado";
  const habilitado = !!(info?.habilitada && info.horarios.length > 0);
  if (habilitado) return tieneCitas ? "con-citas" : "sin-citas";
  return esDomingoKey(key) ? "domingo" : "deshabilitado";
}

const ESTILO_DIA: Record<EstadoVisual, string> = {
  pasado: "bg-stone-50 text-stone-300 cursor-not-allowed",
  "con-citas": "bg-[#D4B06A] text-[#2F2F2F] hover:bg-[#c19f5a]",
  "sin-citas": "bg-[#e6f7f1] text-[#2F2F2F] hover:bg-[#d3f0e6]",
  domingo: "bg-[#f7f7f7] text-stone-300 hover:bg-stone-100",
  deshabilitado: "bg-[#e5e5e5] text-stone-400 hover:bg-stone-300",
};

function MesGrid({
  anio,
  mesIdx0,
  mapa,
  diasConCitas,
  onDiaClick,
  onHabilitarMes,
  habilitando,
  mensaje,
}: {
  anio: number;
  mesIdx0: number;
  mapa: Map<string, DiaDisponibilidad>;
  diasConCitas: Set<string>;
  onDiaClick: (key: string) => void;
  onHabilitarMes: (anio: number, mes1: number) => void;
  habilitando: boolean;
  mensaje: string | null;
}) {
  const primerDiaSemana = (new Date(Date.UTC(anio, mesIdx0, 1)).getUTCDay() + 6) % 7;
  const diasEnMes = new Date(Date.UTC(anio, mesIdx0 + 1, 0)).getUTCDate();
  const hoy = hoyFechaKeyLocal();

  return (
    <div className="bg-white rounded-2xl border border-[#E5E5E5] p-5">
      <div className="flex items-center justify-between mb-3 gap-2">
        <p className="font-bold text-[#2F2F2F]">
          {MESES[mesIdx0]} {anio}
        </p>
        <button
          type="button"
          disabled={habilitando}
          onClick={() => onHabilitarMes(anio, mesIdx0 + 1)}
          className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-[#D4B06A] hover:bg-[#c19f5a] disabled:opacity-60 text-[#2F2F2F] transition-colors"
        >
          {habilitando && (
            <span className="w-3 h-3 border-2 border-[#2F2F2F]/40 border-t-[#2F2F2F] rounded-full animate-spin" />
          )}
          {habilitando ? "Habilitando…" : "Habilitar mes completo"}
        </button>
      </div>

      {mensaje && <p className="text-xs text-emerald-600 font-medium mb-2">{mensaje}</p>}

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
          const estado = estadoVisualDia(key, info, diasConCitas.has(key), hoy);
          const titulo =
            estado === "con-citas" || estado === "sin-citas"
              ? `${info!.horarios.length} horarios${diasConCitas.has(key) ? " — con citas" : ""}`
              : estado === "domingo"
                ? "Domingo — sin habilitar (no incluido en “mes completo”)"
                : estado === "deshabilitado"
                  ? "Sin disponibilidad"
                  : undefined;
          return (
            <button
              key={dia}
              type="button"
              disabled={estado === "pasado"}
              onClick={() => onDiaClick(key)}
              className={`aspect-square rounded-lg text-xs font-medium transition-colors ${ESTILO_DIA[estado]}`}
              title={titulo}
            >
              {dia}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-3 text-[10px] text-stone-500">
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-[#D4B06A] inline-block" /> Con citas</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-[#e6f7f1] inline-block" /> Habilitado</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-[#e5e5e5] inline-block" /> Deshabilitado</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-[#f7f7f7] border border-stone-200 inline-block" /> Domingo</span>
      </div>
    </div>
  );
}

export default function DisponibilidadPanel({
  anioInicial,
  mesInicial,
  disponibilidad,
  diasConCitas,
}: {
  anioInicial: number;
  mesInicial: number;
  disponibilidad: DiaDisponibilidad[];
  diasConCitas: string[];
}) {
  const router = useRouter();

  // Derivado de las props (siempre fresco tras router.refresh()), con un
  // pequeño overlay optimista para reflejar la última acción al instante
  // sin esperar el round-trip del refresh — antes esto vivía en un
  // useState inicializado una sola vez y nunca se resincronizaba con las
  // props nuevas, por eso "Habilitar mes completo" no se veía reflejado
  // hasta recargar la página a mano.
  const baseMapa = useMemo(() => {
    const m = new Map<string, DiaDisponibilidad>();
    for (const d of disponibilidad) m.set(d.fechaKey, d);
    return m;
  }, [disponibilidad]);

  // Overlay optimista para reflejar la última acción al instante, sin
  // esperar el round-trip de router.refresh(). Se resetea ajustando el
  // estado durante el render (patrón recomendado por React para "resetear
  // estado cuando cambia una prop") en vez de un useEffect — antes vivía en
  // un useState inicializado una sola vez que nunca se resincronizaba con
  // las props nuevas, por eso "Habilitar mes completo" no se veía
  // reflejado hasta recargar la página a mano.
  const [prevDisponibilidad, setPrevDisponibilidad] = useState(disponibilidad);
  const [overrides, setOverrides] = useState<Map<string, DiaDisponibilidad>>(new Map());
  if (disponibilidad !== prevDisponibilidad) {
    setPrevDisponibilidad(disponibilidad);
    setOverrides(new Map());
  }
  const mapa = useMemo(() => {
    const merged = new Map(baseMapa);
    for (const [k, v] of overrides) merged.set(k, v);
    return merged;
  }, [baseMapa, overrides]);

  const diasConCitasSet = useMemo(() => new Set(diasConCitas), [diasConCitas]);

  const [diaEditando, setDiaEditando] = useState<string | null>(null);
  const [horariosEdit, setHorariosEdit] = useState<Set<string>>(new Set());
  const [habilitadaEdit, setHabilitadaEdit] = useState(true);
  const [busyDia, setBusyDia] = useState(false);
  const [errorDia, setErrorDia] = useState<string | null>(null);

  const [habilitandoMes, setHabilitandoMes] = useState<string | null>(null);
  const [mensajePorMes, setMensajePorMes] = useState<Record<string, string>>({});

  function abrirDia(key: string) {
    const info = mapa.get(key);
    setDiaEditando(key);
    setHabilitadaEdit(info?.habilitada ?? true);
    setHorariosEdit(new Set(info?.horarios?.length ? info.horarios : HORARIOS_AGENDA));
    setErrorDia(null);
  }

  async function guardarDia(key: string, habilitada: boolean, horarios: string[]) {
    setBusyDia(true);
    setErrorDia(null);
    try {
      const res = await fetch("/api/admin/agenda/disponibilidad", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fecha: key, habilitada, horarios }),
      });
      if (!res.ok) throw new Error("request-failed");
      setOverrides((prev) => new Map(prev).set(key, { fechaKey: key, habilitada, horarios }));
      setDiaEditando(null);
      router.refresh();
    } catch {
      setErrorDia("No pudimos guardar la disponibilidad. Probá de nuevo.");
    } finally {
      setBusyDia(false);
    }
  }

  async function habilitarMesCompleto(anio: number, mes1: number) {
    const mesKey = `${anio}-${mes1}`;
    setHabilitandoMes(mesKey);
    setMensajePorMes((prev) => ({ ...prev, [mesKey]: "" }));
    try {
      const res = await fetch("/api/admin/agenda/disponibilidad/mes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ anio, mes: mes1 }),
      });
      if (!res.ok) throw new Error("request-failed");
      const json = await res.json();

      // Overlay optimista: marca de una todos los días hábiles (lunes a
      // sábado) de ese mes como habilitados con los horarios estándar, sin
      // esperar el refresh del servidor.
      const diasEnMes = new Date(Date.UTC(anio, mes1, 0)).getUTCDate();
      setOverrides((prev) => {
        const next = new Map(prev);
        for (let d = 1; d <= diasEnMes; d++) {
          const fecha = new Date(Date.UTC(anio, mes1 - 1, d));
          if (!esDiaHabil(fecha)) continue;
          const key = `${anio}-${pad2(mes1)}-${pad2(d)}`;
          next.set(key, { fechaKey: key, habilitada: true, horarios: [...HORARIOS_AGENDA] });
        }
        return next;
      });

      setMensajePorMes((prev) => ({ ...prev, [mesKey]: `${json.dias} días habilitados` }));
      router.refresh();
    } catch {
      setMensajePorMes((prev) => ({ ...prev, [mesKey]: "No pudimos habilitar el mes. Probá de nuevo." }));
    } finally {
      setHabilitandoMes(null);
    }
  }

  const meses = [0, 1, 2].map((offset) => {
    const total = mesInicial + offset;
    return { anio: anioInicial + Math.floor(total / 12), mesIdx0: total % 12 };
  });

  const diasConfigurados = Array.from(mapa.values())
    .filter((d) => d.habilitada && d.horarios.length > 0)
    .sort((a, b) => a.fechaKey.localeCompare(b.fechaKey));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {meses.map(({ anio, mesIdx0 }) => {
          const mesKey = `${anio}-${mesIdx0 + 1}`;
          return (
            <MesGrid
              key={mesKey}
              anio={anio}
              mesIdx0={mesIdx0}
              mapa={mapa}
              diasConCitas={diasConCitasSet}
              onDiaClick={abrirDia}
              onHabilitarMes={habilitarMesCompleto}
              habilitando={habilitandoMes === mesKey}
              mensaje={mensajePorMes[mesKey] || null}
            />
          );
        })}
      </div>

      <div className="bg-white rounded-2xl border border-[#E5E5E5] p-5">
        <p className="text-xs font-bold uppercase tracking-widest text-stone-400 mb-3">
          Días habilitados ({diasConfigurados.length})
        </p>
        {diasConfigurados.length === 0 ? (
          <p className="text-sm text-stone-400">Todavía no hay ningún día habilitado.</p>
        ) : (
          <div className="space-y-1.5 max-h-80 overflow-y-auto">
            {diasConfigurados.map((d) => (
              <div
                key={d.fechaKey}
                className="flex items-center justify-between gap-3 text-sm py-1.5 border-b border-[#F0F0F0] last:border-0"
              >
                <div className="min-w-0">
                  <span className="font-medium text-[#2F2F2F] capitalize">{fechaEsDesdeKey(d.fechaKey)}</span>
                  <span className="text-stone-400 ml-2 text-xs">{d.horarios.join(", ")}</span>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => abrirDia(d.fechaKey)}
                    className="text-[#D4B06A] font-medium text-xs hover:underline"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => guardarDia(d.fechaKey, false, [])}
                    className="text-red-600 font-medium text-xs hover:underline"
                  >
                    Deshabilitar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {diaEditando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={() => setDiaEditando(null)}>
          <div
            className="bg-white rounded-2xl border border-[#D4B06A] p-5 space-y-4 w-full max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-widest text-stone-400 capitalize">
                {fechaEsDesdeKey(diaEditando)}
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
              <div className="grid grid-cols-4 gap-2">
                {HORARIOS_AGENDA.map((h) => {
                  const activo = horariosEdit.has(h);
                  return (
                    <label
                      key={h}
                      className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium border cursor-pointer ${
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

            {errorDia && <p className="text-xs text-red-600">{errorDia}</p>}

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                disabled={busyDia}
                onClick={() => guardarDia(diaEditando, habilitadaEdit, habilitadaEdit ? Array.from(horariosEdit) : [])}
                className="px-4 py-2 bg-[#D4B06A] hover:bg-[#c19f5a] disabled:opacity-50 text-[#2F2F2F] font-bold text-xs rounded-xl transition-colors"
              >
                {busyDia ? "Guardando…" : "Guardar"}
              </button>
              <button
                type="button"
                disabled={busyDia}
                onClick={() => guardarDia(diaEditando, false, [])}
                className="px-4 py-2 border border-red-300 text-red-600 hover:bg-red-50 disabled:opacity-50 font-bold text-xs rounded-xl transition-colors"
              >
                Deshabilitar día
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
