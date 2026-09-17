"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { HORARIOS_AGENDA } from "@/lib/agenda/horarios";
import { tipoClienteAgendaOptions, consultaSchema } from "@/lib/validators/cita";
import {
  nombreSchema,
  telefonoSchema,
  emailSchema,
  razonSocialSchema,
  validateField,
} from "@/lib/validators/configurador";
import { SHOWROOM_DIRECCION } from "@/lib/agenda/showroom";

const inputClass =
  "w-full rounded-lg border border-[#E5E5E5] px-3 py-2.5 text-sm text-[#2F2F2F] bg-white focus:outline-none focus:ring-2 focus:ring-[#D4B06A]";
const labelClass = "text-sm font-medium text-[#2F2F2F]";

function inputClassFor(error: string | null, isTouched: boolean): string {
  if (!isTouched) return inputClass;
  return error
    ? `${inputClass} border-red-300 focus:ring-red-300`
    : `${inputClass} border-emerald-400 focus:ring-emerald-300`;
}

function FieldError({ msg }: { msg: string | null }) {
  if (!msg) return null;
  return (
    <p className="text-xs text-red-500 mt-1 flex items-start gap-1">
      <span className="shrink-0">⚠</span>
      {msg}
    </p>
  );
}

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];
const DIAS_SEMANA = ["L", "M", "M", "J", "V", "S", "D"];

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function fechaKey(anio: number, mesIdx0: number, dia: number) {
  return `${anio}-${pad2(mesIdx0 + 1)}-${pad2(dia)}`;
}

function hoyKey() {
  const now = new Date();
  return fechaKey(now.getFullYear(), now.getMonth(), now.getDate());
}

type Paso = "calendario" | "horario" | "form" | "confirmado";

export default function AgendaBooking() {
  const now = new Date();
  const [anio, setAnio] = useState(now.getFullYear());
  const [mesIdx0, setMesIdx0] = useState(now.getMonth());
  const mesKey = `${anio}-${mesIdx0}`;
  const [diasPorMes, setDiasPorMes] = useState<Record<string, Record<string, "disponible" | "completo">>>({});
  const estadoDiasMes = diasPorMes[mesKey] ?? {};
  const cargandoMes = !(mesKey in diasPorMes);

  const [fechaSel, setFechaSel] = useState<string | null>(null);
  const [habilitados, setHabilitados] = useState<string[]>([]);
  const [ocupados, setOcupados] = useState<string[]>([]);
  const [cargandoHorarios, setCargandoHorarios] = useState(false);
  const [horarioSel, setHorarioSel] = useState<string | null>(null);

  const [paso, setPaso] = useState<Paso>("calendario");
  const [citaId, setCitaId] = useState<string | null>(null);

  const [form, setForm] = useState({
    tipoCliente: "particular" as (typeof tipoClienteAgendaOptions)[number],
    nombre: "",
    email: "",
    telefono: "",
    razonSocial: "",
    consulta: "",
  });
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [intentoEnviar, setIntentoEnviar] = useState(false);

  function touch(field: string) {
    setTouched((prev) => ({ ...prev, [field]: true }));
  }

  useEffect(() => {
    if (mesKey in diasPorMes) return;
    let cancelado = false;
    fetch(`/api/agenda/disponibilidad?anio=${anio}&mes=${mesIdx0 + 1}`)
      .then((r) => r.json())
      .then((json) => {
        if (cancelado) return;
        setDiasPorMes((prev) => ({ ...prev, [mesKey]: json.dias ?? {} }));
      });
    return () => {
      cancelado = true;
    };
  }, [anio, mesIdx0, mesKey, diasPorMes]);

  const primerDiaSemana = useMemo(() => {
    // 0=domingo → lo convertimos a 0=lunes para que la grilla arranque en lunes
    const dow = new Date(Date.UTC(anio, mesIdx0, 1)).getUTCDay();
    return (dow + 6) % 7;
  }, [anio, mesIdx0]);

  const diasEnMes = useMemo(() => new Date(Date.UTC(anio, mesIdx0 + 1, 0)).getUTCDate(), [anio, mesIdx0]);

  const esMesPasado = anio === now.getFullYear() ? mesIdx0 < now.getMonth() : anio < now.getFullYear();

  async function seleccionarDia(key: string) {
    setFechaSel(key);
    setHorarioSel(null);
    setPaso("horario");
    setCargandoHorarios(true);
    try {
      const res = await fetch(`/api/agenda/disponibilidad?fecha=${key}`);
      const json = await res.json();
      setHabilitados(json.habilitados ?? []);
      setOcupados(json.ocupados ?? []);
    } finally {
      setCargandoHorarios(false);
    }
  }

  function seleccionarHorario(h: string) {
    setHorarioSel(h);
    setPaso("form");
    setError(null);
  }

  const errors = {
    nombre: validateField(nombreSchema, form.nombre.trim()),
    email: validateField(emailSchema, form.email.trim()),
    telefono: validateField(telefonoSchema, form.telefono.trim()),
    consulta: validateField(consultaSchema, form.consulta.trim()),
    razonSocial:
      form.tipoCliente === "empresa" ? validateField(razonSocialSchema, form.razonSocial.trim()) : null,
  };

  const puedeConfirmar =
    !!fechaSel &&
    !!horarioSel &&
    !errors.nombre &&
    !errors.email &&
    !errors.telefono &&
    !errors.consulta &&
    !errors.razonSocial;

  async function confirmarVisita() {
    setIntentoEnviar(true);
    if (!fechaSel || !horarioSel || !puedeConfirmar) return;
    setError(null);
    setEnviando(true);
    try {
      const res = await fetch("/api/agenda/citas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fecha: fechaSel,
          horario: horarioSel,
          tipoCliente: form.tipoCliente,
          nombre: form.nombre.trim(),
          email: form.email.trim(),
          telefono: form.telefono.trim(),
          razonSocial: form.razonSocial.trim() || undefined,
          consulta: form.consulta.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "No pudimos agendar tu visita.");
        if (res.status === 409) {
          // el horario se ocupó entre que lo eligió y confirmó — refresca
          await seleccionarDia(fechaSel);
          setPaso("horario");
        }
        return;
      }
      setCitaId(json.id);
      setPaso("confirmado");
    } catch {
      setError("No pudimos agendar tu visita. Probá de nuevo.");
    } finally {
      setEnviando(false);
    }
  }

  if (paso === "confirmado" && fechaSel && horarioSel) {
    const [y, m, d] = fechaSel.split("-").map(Number);
    const fechaTexto = new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("es-AR", {
      timeZone: "UTC",
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    return (
      <div className="bg-white rounded-2xl border border-[#E5E5E5] p-8 text-center">
        <p className="text-4xl mb-3">✅</p>
        <h2 className="text-xl font-bold text-[#2F2F2F] mb-2">¡Tu visita está confirmada!</h2>
        <p className="text-stone-600 text-sm mb-1">
          {fechaTexto} a las {horarioSel} hs
        </p>
        <p className="text-stone-600 text-sm mb-4">{SHOWROOM_DIRECCION}</p>
        <p className="text-stone-500 text-xs">
          Te enviamos un email de confirmación con los detalles. Guardalo — ahí vas a encontrar el
          link para cancelar si no podés asistir.
        </p>
        {citaId && (
          <p className="text-stone-400 text-xs mt-3">
            Código de referencia: <span className="font-mono">{citaId}</span>
          </p>
        )}
        <Link
          href="/"
          className="inline-block mt-6 px-6 py-3 bg-[#D4B06A] hover:bg-[#c19f5a] text-[#2F2F2F] font-bold text-sm rounded-xl transition-colors"
        >
          Volver al inicio
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-[#E5E5E5] p-5">
        <div className="flex items-center justify-between mb-4">
          <button
            type="button"
            onClick={() => {
              if (mesIdx0 === 0) {
                setAnio((a) => a - 1);
                setMesIdx0(11);
              } else {
                setMesIdx0((m) => m - 1);
              }
            }}
            disabled={esMesPasado}
            className="w-8 h-8 rounded-full border border-[#E5E5E5] text-stone-500 hover:bg-stone-50 disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Mes anterior"
          >
            ‹
          </button>
          <p className="font-bold text-[#2F2F2F]">
            {MESES[mesIdx0]} {anio}
          </p>
          <button
            type="button"
            onClick={() => {
              if (mesIdx0 === 11) {
                setAnio((a) => a + 1);
                setMesIdx0(0);
              } else {
                setMesIdx0((m) => m + 1);
              }
            }}
            className="w-8 h-8 rounded-full border border-[#E5E5E5] text-stone-500 hover:bg-stone-50"
            aria-label="Mes siguiente"
          >
            ›
          </button>
        </div>

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
            const key = fechaKey(anio, mesIdx0, dia);
            const estado = estadoDiasMes[key]; // "disponible" | "completo" | undefined
            const disponible = !cargandoMes && estado === "disponible" && key >= hoyKey();
            const completo = !cargandoMes && estado === "completo";
            const esHoy = key === hoyKey();
            const seleccionado = key === fechaSel;

            let clases: string;
            let title: string | undefined;
            if (seleccionado) {
              clases = "border-2 border-[#D4B06A] bg-[#D4B06A]/20 text-[#2F2F2F] font-bold";
            } else if (disponible) {
              clases = "bg-[#D4B06A] text-[#2F2F2F] hover:bg-[#c19f5a] cursor-pointer";
            } else if (completo) {
              clases = "bg-stone-300 text-stone-500 cursor-not-allowed";
              title = "Sin turnos disponibles";
            } else {
              clases = "bg-stone-100 text-stone-300 cursor-not-allowed";
            }

            return (
              <button
                key={dia}
                type="button"
                disabled={!disponible}
                onClick={() => seleccionarDia(key)}
                title={title}
                className={`aspect-square rounded-lg text-sm font-medium transition-colors ${clases} ${
                  esHoy && !seleccionado ? "ring-1 ring-[#D4B06A]" : ""
                }`}
              >
                {dia}
              </button>
            );
          })}
        </div>
        {cargandoMes && <p className="text-xs text-stone-400 mt-3">Cargando disponibilidad…</p>}
      </div>

      {paso !== "calendario" && fechaSel && (
        <div className="bg-white rounded-2xl border border-[#E5E5E5] p-5 space-y-4">
          <p className="text-xs font-bold uppercase tracking-widest text-stone-400">
            Elegí un horario
          </p>
          {cargandoHorarios ? (
            <p className="text-sm text-stone-400">Cargando horarios…</p>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {HORARIOS_AGENDA.map((h) => {
                const habilitado = habilitados.includes(h);
                const ocupado = ocupados.includes(h);
                const disponible = habilitado && !ocupado;
                const seleccionado = h === horarioSel;
                if (!habilitado) return null;
                return (
                  <button
                    key={h}
                    type="button"
                    disabled={!disponible}
                    onClick={() => seleccionarHorario(h)}
                    className={`py-2.5 rounded-lg text-sm font-bold transition-colors ${
                      seleccionado
                        ? "bg-[#2F2F2F] text-white"
                        : disponible
                          ? "border border-[#D4B06A] text-[#8a6a2e] hover:bg-[#D4B06A] hover:text-[#2F2F2F]"
                          : "bg-stone-100 text-stone-300 cursor-not-allowed"
                    }`}
                  >
                    {h}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {paso === "form" && (
        <div className="bg-white rounded-2xl border border-[#E5E5E5] p-5 space-y-4">
          <p className="text-xs font-bold uppercase tracking-widest text-stone-400">Tus datos</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="block space-y-1.5">
              <span className={labelClass}>Tipo</span>
              <select
                className={inputClass}
                value={form.tipoCliente}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    tipoCliente: e.target.value as (typeof tipoClienteAgendaOptions)[number],
                  }))
                }
              >
                {tipoClienteAgendaOptions.map((t) => (
                  <option key={t} value={t}>
                    {t === "particular" ? "Particular" : "Empresa"}
                  </option>
                ))}
              </select>
            </label>
            {form.tipoCliente === "empresa" && (
              <label className="block space-y-1.5">
                <span className={labelClass}>Razón social *</span>
                <input
                  className={inputClassFor(errors.razonSocial, touched.razonSocial || intentoEnviar)}
                  value={form.razonSocial}
                  onChange={(e) => setForm((f) => ({ ...f, razonSocial: e.target.value }))}
                  onBlur={() => touch("razonSocial")}
                />
                <FieldError msg={(touched.razonSocial || intentoEnviar) ? errors.razonSocial : null} />
              </label>
            )}
            <label className="block space-y-1.5">
              <span className={labelClass}>Nombre completo *</span>
              <input
                className={inputClassFor(errors.nombre, touched.nombre || intentoEnviar)}
                value={form.nombre}
                onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                onBlur={() => touch("nombre")}
              />
              <FieldError msg={(touched.nombre || intentoEnviar) ? errors.nombre : null} />
            </label>
            <label className="block space-y-1.5">
              <span className={labelClass}>Email *</span>
              <input
                type="email"
                className={inputClassFor(errors.email, touched.email || intentoEnviar)}
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                onBlur={() => touch("email")}
              />
              <FieldError msg={(touched.email || intentoEnviar) ? errors.email : null} />
            </label>
            <label className="block space-y-1.5">
              <span className={labelClass}>Teléfono / WhatsApp *</span>
              <input
                className={inputClassFor(errors.telefono, touched.telefono || intentoEnviar)}
                value={form.telefono}
                onChange={(e) => setForm((f) => ({ ...f, telefono: e.target.value }))}
                onBlur={() => touch("telefono")}
                placeholder="+54 9 11 1234-5678"
              />
              <FieldError msg={(touched.telefono || intentoEnviar) ? errors.telefono : null} />
            </label>
          </div>

          <label className="block space-y-1.5">
            <span className={labelClass}>¿Qué estás buscando o necesitás saber? (opcional)</span>
            <textarea
              className={inputClassFor(errors.consulta, touched.consulta || intentoEnviar)}
              rows={3}
              value={form.consulta}
              onChange={(e) => setForm((f) => ({ ...f, consulta: e.target.value }))}
              onBlur={() => touch("consulta")}
              placeholder="Contanos brevemente qué te interesa o qué consultas tenés para aprovechar mejor la visita (opcional)."
            />
            <FieldError msg={(touched.consulta || intentoEnviar) ? errors.consulta : null} />
          </label>

          {error && <p className="text-xs text-red-600">{error}</p>}

          <button
            type="button"
            disabled={enviando}
            onClick={confirmarVisita}
            className="w-full py-3 bg-[#D4B06A] hover:bg-[#c19f5a] disabled:opacity-50 text-[#2F2F2F] font-bold text-sm rounded-xl transition-colors"
          >
            {enviando ? "Confirmando..." : "Confirmar visita"}
          </button>
        </div>
      )}
    </div>
  );
}
