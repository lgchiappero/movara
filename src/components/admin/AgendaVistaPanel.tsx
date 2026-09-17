"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export type CitaAdmin = {
  id: string;
  fechaKey: string;
  horario: string;
  estado: string;
  tipoCliente: string;
  nombre: string;
  email: string;
  telefono: string;
  razonSocial: string | null;
  consulta: string;
  canceladaPor: string | null;
  motivoCancelacion: string | null;
};

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];
const DIAS_SEMANA = ["L", "M", "M", "J", "V", "S", "D"];

const ESTADO_CLASSES: Record<string, string> = {
  confirmada: "bg-[#D4B06A]/20 text-[#8a6a2e]",
  cancelada: "bg-stone-200 text-stone-500",
  completada: "bg-emerald-100 text-emerald-700",
};

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function mesParam(anio: number, mesIdx0: number) {
  return `${anio}-${pad2(mesIdx0 + 1)}`;
}

function fechaEsDesdeKey(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("es-AR", {
    timeZone: "UTC",
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function AgendaVistaPanel({
  anio,
  mesIdx0,
  vista,
  citasDelMes,
  todasLasCitas,
}: {
  anio: number;
  mesIdx0: number;
  vista: "calendario" | "lista";
  citasDelMes: CitaAdmin[];
  todasLasCitas: CitaAdmin[];
}) {
  const router = useRouter();
  const [seleccionadaId, setSeleccionadaId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lista = vista === "lista" ? todasLasCitas : citasDelMes;
  const seleccionada = lista.find((c) => c.id === seleccionadaId) ?? null;

  const porDia = new Map<string, CitaAdmin[]>();
  for (const c of citasDelMes) {
    if (!porDia.has(c.fechaKey)) porDia.set(c.fechaKey, []);
    porDia.get(c.fechaKey)!.push(c);
  }

  const primerDiaSemana = (new Date(Date.UTC(anio, mesIdx0, 1)).getUTCDay() + 6) % 7;
  const diasEnMes = new Date(Date.UTC(anio, mesIdx0 + 1, 0)).getUTCDate();

  const prevAnio = mesIdx0 === 0 ? anio - 1 : anio;
  const prevMes = mesIdx0 === 0 ? 11 : mesIdx0 - 1;
  const nextAnio = mesIdx0 === 11 ? anio + 1 : anio;
  const nextMes = mesIdx0 === 11 ? 0 : mesIdx0 + 1;

  async function accionCita(id: string, accion: "cancelar" | "completar", motivo?: string) {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/agenda/citas/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(accion === "cancelar" ? { accion, motivo } : { accion }),
      });
      if (!res.ok) throw new Error("request-failed");
      router.refresh();
    } catch {
      setError("No pudimos actualizar la visita. Probá de nuevo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href={`?mes=${mesParam(prevAnio, prevMes)}${vista === "lista" ? "&vista=lista" : ""}`}
            className="w-8 h-8 flex items-center justify-center rounded-full border border-[#E5E5E5] text-stone-500 hover:bg-stone-50"
            aria-label="Mes anterior"
          >
            ‹
          </Link>
          <p className="font-bold text-[#2F2F2F] w-36 text-center">
            {MESES[mesIdx0]} {anio}
          </p>
          <Link
            href={`?mes=${mesParam(nextAnio, nextMes)}${vista === "lista" ? "&vista=lista" : ""}`}
            className="w-8 h-8 flex items-center justify-center rounded-full border border-[#E5E5E5] text-stone-500 hover:bg-stone-50"
            aria-label="Mes siguiente"
          >
            ›
          </Link>
        </div>
        <div className="flex gap-2 text-xs font-bold">
          <Link
            href={`?mes=${mesParam(anio, mesIdx0)}`}
            className={`px-3 py-1.5 rounded-full ${vista === "calendario" ? "bg-[#2F2F2F] text-white" : "bg-stone-100 text-stone-500"}`}
          >
            Calendario
          </Link>
          <Link
            href={`?mes=${mesParam(anio, mesIdx0)}&vista=lista`}
            className={`px-3 py-1.5 rounded-full ${vista === "lista" ? "bg-[#2F2F2F] text-white" : "bg-stone-100 text-stone-500"}`}
          >
            Lista
          </Link>
        </div>
      </div>

      {vista === "calendario" ? (
        <div className="bg-white rounded-2xl border border-[#E5E5E5] p-5">
          <div className="grid grid-cols-7 gap-1 text-center text-xs text-stone-400 font-medium mb-2">
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
              const citasDia = porDia.get(key) ?? [];
              return (
                <div key={dia} className="min-h-[64px] rounded-lg border border-[#F0F0F0] p-1">
                  <p className="text-[11px] text-stone-400 mb-0.5">{dia}</p>
                  <div className="space-y-0.5">
                    {citasDia.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setSeleccionadaId(c.id)}
                        className={`w-full text-left text-[10px] px-1 py-0.5 rounded truncate ${ESTADO_CLASSES[c.estado] ?? "bg-stone-100 text-stone-500"}`}
                        title={`${c.horario} — ${c.nombre}`}
                      >
                        {c.horario} {c.nombre}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#E5E5E5] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E5E5E5] text-left text-stone-500 text-xs uppercase tracking-wide">
                <th className="px-4 py-3 font-medium">Fecha</th>
                <th className="px-4 py-3 font-medium">Horario</th>
                <th className="px-4 py-3 font-medium">Nombre</th>
                <th className="px-4 py-3 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody>
              {todasLasCitas.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => setSeleccionadaId(c.id)}
                  className="border-b border-[#F0F0F0] last:border-0 cursor-pointer hover:bg-stone-50"
                >
                  <td className="px-4 py-3 text-stone-600">{c.fechaKey}</td>
                  <td className="px-4 py-3 text-stone-600">{c.horario}</td>
                  <td className="px-4 py-3 font-medium text-[#2F2F2F]">{c.nombre}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${ESTADO_CLASSES[c.estado] ?? "bg-stone-100 text-stone-500"}`}>
                      {c.estado}
                    </span>
                  </td>
                </tr>
              ))}
              {todasLasCitas.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-stone-400">
                    Todavía no hay visitas agendadas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {seleccionada && (
        <div className="bg-white rounded-2xl border border-[#D4B06A] p-5 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-widest text-stone-400">
              Detalle de la visita
            </p>
            <button
              type="button"
              onClick={() => setSeleccionadaId(null)}
              className="text-stone-400 hover:text-stone-600 text-sm"
            >
              ✕
            </button>
          </div>
          <div className="text-sm space-y-1">
            <p><span className="text-stone-500">Fecha:</span> <span className="font-medium text-[#2F2F2F]">{fechaEsDesdeKey(seleccionada.fechaKey)}</span></p>
            <p><span className="text-stone-500">Horario:</span> <span className="font-medium text-[#2F2F2F]">{seleccionada.horario} hs</span></p>
            <p><span className="text-stone-500">Tipo:</span> <span className="font-medium text-[#2F2F2F]">{seleccionada.tipoCliente === "empresa" ? "Empresa" : "Particular"}</span></p>
            <p><span className="text-stone-500">Nombre:</span> <span className="font-medium text-[#2F2F2F]">{seleccionada.nombre}</span></p>
            {seleccionada.razonSocial && <p><span className="text-stone-500">Razón social:</span> <span className="font-medium text-[#2F2F2F]">{seleccionada.razonSocial}</span></p>}
            <p><span className="text-stone-500">Email:</span> <span className="font-medium text-[#2F2F2F]">{seleccionada.email}</span></p>
            <p><span className="text-stone-500">Teléfono:</span> <span className="font-medium text-[#2F2F2F]">{seleccionada.telefono}</span></p>
            {seleccionada.consulta.trim() && (
              <p><span className="text-stone-500">Qué busca:</span> <span className="text-[#2F2F2F]">{seleccionada.consulta}</span></p>
            )}
            <p><span className="text-stone-500">Estado:</span> <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${ESTADO_CLASSES[seleccionada.estado] ?? ""}`}>{seleccionada.estado}</span></p>
            {seleccionada.estado === "cancelada" && (
              <p className="text-stone-500 text-xs">
                Cancelada por {seleccionada.canceladaPor ?? "—"}
                {seleccionada.motivoCancelacion ? ` — motivo: ${seleccionada.motivoCancelacion}` : ""}
              </p>
            )}
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}

          {seleccionada.estado === "confirmada" && (
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => accionCita(seleccionada.id, "completar")}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition-colors"
              >
                Marcar como completada
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  const motivo = window.prompt("Motivo de la cancelación (opcional):") ?? undefined;
                  accionCita(seleccionada.id, "cancelar", motivo);
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition-colors"
              >
                Cancelar visita
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
