"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { REGIONAL_MODELS, PROVINCIA_A_MODELO, PROVINCIAS_AR } from "@/data/regional-models";

// ─────────────────────────────────────────────────────────
// Data
// ─────────────────────────────────────────────────────────

const MOVARA_MODELS = [
  {
    key: "10ft" as const,
    nombre: "MOVARA 10ft",
    superficie: 18,
    tagline: "Studio, espacio mínimo o módulo independiente",
    precio: { min: 15_000, max: 20_000 },
  },
  {
    key: "20ft" as const,
    nombre: "MOVARA 20ft",
    superficie: 37,
    tagline: "El más versátil — 1 o 2 ambientes",
    precio: { min: 22_000, max: 30_000 },
    badge: "Más elegido",
  },
  {
    key: "40ft" as const,
    nombre: "MOVARA 40ft",
    superficie: 74,
    tagline: "Máximo espacio — familia o inversión grande",
    precio: { min: 35_000, max: 50_000 },
  },
] as const;

const FINALIDADES = [
  {
    key: "inversor",
    emoji: "💰",
    label: "Inversor",
    desc: "Transformá capital en renta en semanas",
    subdesc: "Airbnb, renta, glamping",
  },
  {
    key: "agro",
    emoji: "🌾",
    label: "Agro / Campo",
    desc: "Infraestructura lista para tu campo, sin meses de obra",
    subdesc: "Vivienda o infraestructura rural",
  },
  {
    key: "vivienda",
    emoji: "🏠",
    label: "Primera vivienda",
    desc: "Una nueva forma de habitar",
    subdesc: "Tu hogar propio",
  },
  {
    key: "turismo",
    emoji: "🏕️",
    label: "Turismo y hospitalidad",
    desc: "Eco resort, glamping o expansión rápida",
    subdesc: "Eco resort, glamping",
  },
  {
    key: "empresa",
    emoji: "💼",
    label: "Empresa / B2B",
    desc: "Oficinas, campamentos o infraestructura corporativa",
    subdesc: "Corporativo o industrial",
  },
  {
    key: "sector-publico",
    emoji: "🏛️",
    label: "Sector público",
    desc: "Vivienda social o infraestructura municipal",
    subdesc: "Municipal o social",
  },
] as const;

type ModeloKey = (typeof MOVARA_MODELS)[number]["key"];
type FinalidadKey = (typeof FINALIDADES)[number]["key"];

// ─────────────────────────────────────────────────────────
// WA message builder
// ─────────────────────────────────────────────────────────

function buildWAMessage(
  modelo: ModeloKey,
  finalidad: FinalidadKey,
  localidad: string,
  provincia: string
): string {
  const m = MOVARA_MODELS.find((x) => x.key === modelo)!;
  const f = FINALIDADES.find((x) => x.key === finalidad)!;
  const regionalKey = PROVINCIA_A_MODELO[provincia] ?? "pampa";
  const regional = REGIONAL_MODELS[regionalKey];
  const upgrades = regional ? regional.extras.slice(0, 3).join(", ") : "Estándar";
  const loc = [localidad.trim(), provincia].filter(Boolean).join(", ");

  return (
    `Hola MOVARA! 👋\n` +
    `📦 Modelo: ${m.nombre} — ${m.superficie}m²\n` +
    `🎯 Uso: ${f.label}\n` +
    `📍 Ubicación: ${loc}\n` +
    `⚙️ Configuración sugerida: ${upgrades}\n` +
    `💰 Precio estimado: USD ${m.precio.min.toLocaleString("es-AR")} – ${m.precio.max.toLocaleString("es-AR")}\n` +
    `¿Me pueden asesorar?`
  );
}

// ─────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────

const STEP_LABELS = ["Modelo", "Finalidad", "Ubicación"] as const;

export default function ConfiguradorMovara() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [slideDir, setSlideDir] = useState<1 | -1>(1);
  const [modelo, setModelo] = useState<ModeloKey | null>(null);
  const [finalidad, setFinalidad] = useState<FinalidadKey | null>(null);
  const [localidad, setLocalidad] = useState("");
  const [provincia, setProvincia] = useState("");
  const [showResult, setShowResult] = useState(false);
  const [waMessage, setWaMessage] = useState("");

  const canNext =
    (step === 1 && modelo !== null) ||
    (step === 2 && finalidad !== null) ||
    (step === 3 && provincia !== "");

  function goNext() {
    if (step < 3) {
      setSlideDir(1);
      setStep((s) => (s + 1) as 2 | 3);
    } else {
      const msg = buildWAMessage(modelo!, finalidad!, localidad, provincia);
      setWaMessage(msg);
      setShowResult(true);
    }
  }

  function goBack() {
    if (showResult) {
      setShowResult(false);
    } else {
      setSlideDir(-1);
      setStep((s) => Math.max(1, s - 1) as 1 | 2);
    }
  }

  function handleSendWA() {
    const number = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "5491100000000";
    window.open(
      `https://wa.me/${number}?text=${encodeURIComponent(waMessage)}`,
      "_blank",
      "noopener,noreferrer"
    );
  }

  const regionalKey = provincia ? (PROVINCIA_A_MODELO[provincia] ?? "pampa") : null;
  const regional = regionalKey ? REGIONAL_MODELS[regionalKey] : null;

  if (showResult) {
    return (
      <main className="min-h-screen bg-stone-50 pt-16">
        <div className="bg-sage-950 px-6 pt-14 pb-10 text-center">
          <span className="text-sage-400 text-xs font-semibold uppercase tracking-[0.2em]">
            Tu configuración
          </span>
          <h1 className="text-3xl font-bold text-white mt-2">Listo. Así queda tu MOVARA.</h1>
          <p className="text-stone-400 mt-2 text-sm">
            Revisá el mensaje y enviánoslo por WhatsApp para arrancar.
          </p>
        </div>
        <div className="max-w-2xl mx-auto px-6 py-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <ResultScreen
              modelo={modelo!}
              finalidad={finalidad!}
              localidad={localidad}
              provincia={provincia}
              regional={regional}
              waMessage={waMessage}
              setWaMessage={setWaMessage}
              onBack={goBack}
              onSend={handleSendWA}
            />
          </motion.div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-stone-50 pt-16">
      {/* Page header */}
      <div className="bg-sage-950 px-6 pt-14 pb-10 text-center">
        <span className="text-sage-400 text-xs font-semibold uppercase tracking-[0.2em]">
          Configurador
        </span>
        <h1 className="text-3xl sm:text-4xl font-bold text-white mt-2 tracking-tight">
          Diseñá tu MOVARA
        </h1>
        <p className="text-stone-400 mt-2 text-sm">
          Tres pasos para encontrar el módulo ideal y recibir un presupuesto por WhatsApp.
        </p>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-10">
        {/* Progress bar */}
        <div className="mb-10">
          <div className="flex gap-1.5 mb-3">
            {([1, 2, 3] as const).map((n) => (
              <div key={n} className="flex-1 h-1.5 rounded-full bg-stone-200 overflow-hidden">
                <div
                  className="h-full rounded-full bg-sage-500 transition-all duration-500"
                  style={{ width: n <= step ? "100%" : "0%" }}
                />
              </div>
            ))}
          </div>
          <div className="flex justify-between">
            {STEP_LABELS.map((label, i) => (
              <span
                key={label}
                className={`text-xs font-semibold transition-colors ${
                  i + 1 <= step ? "text-sage-600" : "text-stone-400"
                }`}
              >
                {label}
              </span>
            ))}
          </div>
        </div>

        {/* Step content — keyed for enter/exit animation */}
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={step}
            initial={{ opacity: 0, x: slideDir * 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: slideDir * -30 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            {step === 1 && (
              <StepModelo modelo={modelo} onSelect={setModelo} />
            )}
            {step === 2 && (
              <StepFinalidad finalidad={finalidad} onSelect={setFinalidad} />
            )}
            {step === 3 && (
              <StepUbicacion
                localidad={localidad}
                setLocalidad={setLocalidad}
                provincia={provincia}
                setProvincia={setProvincia}
                regional={regional}
              />
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-10 pt-6 border-t border-stone-200">
          {step > 1 ? (
            <button
              type="button"
              onClick={goBack}
              className="flex items-center gap-1.5 px-4 py-2.5 text-stone-500 hover:text-stone-800 text-sm font-semibold transition-colors"
            >
              <ChevronLeftIcon />
              Atrás
            </button>
          ) : (
            <Link
              href="/"
              className="flex items-center gap-1.5 px-4 py-2.5 text-stone-400 hover:text-stone-600 text-sm font-semibold transition-colors"
            >
              <ChevronLeftIcon />
              Inicio
            </Link>
          )}

          <button
            type="button"
            onClick={goNext}
            disabled={!canNext}
            className="flex items-center gap-2 px-8 py-3 bg-sage-600 hover:bg-sage-700 disabled:opacity-35 disabled:cursor-not-allowed text-white text-sm font-bold rounded-full transition-all duration-200 hover:shadow-lg hover:shadow-sage-600/25 hover:-translate-y-px"
          >
            {step === 3 ? "Ver mi configuración" : "Siguiente"}
            <ChevronRightIcon />
          </button>
        </div>
      </div>
    </main>
  );
}

// ─────────────────────────────────────────────────────────
// Step 1 — Modelo
// ─────────────────────────────────────────────────────────

function StepModelo({
  modelo,
  onSelect,
}: {
  modelo: ModeloKey | null;
  onSelect: (k: ModeloKey) => void;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-widest text-sage-600 mb-2">
        Paso 1 de 3
      </p>
      <h2 className="text-2xl font-bold text-stone-900 mb-1">¿Qué tamaño necesitás?</h2>
      <p className="text-stone-500 text-sm mb-8">
        Cada módulo es un contenedor de alta prestación. Elegí según tu proyecto.
      </p>

      <div className="space-y-4">
        {MOVARA_MODELS.map((m) => {
          const selected = modelo === m.key;
          return (
            <button
              key={m.key}
              type="button"
              onClick={() => onSelect(m.key)}
              className={`w-full text-left rounded-2xl border-2 p-5 transition-all duration-200 group cursor-pointer ${
                selected
                  ? "border-sage-500 bg-sage-50 shadow-md shadow-sage-500/10"
                  : "border-stone-200 bg-white hover:border-sage-300 hover:shadow-sm"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2.5 mb-1">
                    <span
                      className={`text-xl font-bold tracking-tight ${
                        selected ? "text-sage-800" : "text-stone-900"
                      }`}
                    >
                      {m.nombre}
                    </span>
                    {"badge" in m && (
                      <span className="px-2 py-0.5 bg-sage-600 text-white text-[10px] font-bold uppercase tracking-wide rounded-full">
                        {m.badge}
                      </span>
                    )}
                  </div>
                  <p className={`text-sm ${selected ? "text-stone-600" : "text-stone-500"}`}>
                    {m.tagline}
                  </p>
                </div>

                <div
                  className={`shrink-0 flex flex-col items-center justify-center rounded-xl w-20 py-3 transition-colors ${
                    selected ? "bg-sage-100" : "bg-stone-100 group-hover:bg-sage-50"
                  }`}
                >
                  <ModuleIcon size={m.key} selected={selected} />
                  <span
                    className={`text-lg font-bold mt-1 ${
                      selected ? "text-sage-700" : "text-stone-700"
                    }`}
                  >
                    {m.superficie}m²
                  </span>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <span
                  className={`text-xs font-semibold ${
                    selected ? "text-sage-600" : "text-stone-400"
                  }`}
                >
                  USD {m.precio.min.toLocaleString("es-AR")} –{" "}
                  {m.precio.max.toLocaleString("es-AR")}
                </span>
                {selected && (
                  <span className="w-5 h-5 rounded-full bg-sage-500 flex items-center justify-center">
                    <CheckIcon className="w-3 h-3 text-white" />
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Step 2 — Finalidad
// ─────────────────────────────────────────────────────────

function StepFinalidad({
  finalidad,
  onSelect,
}: {
  finalidad: FinalidadKey | null;
  onSelect: (k: FinalidadKey) => void;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-widest text-sage-600 mb-2">
        Paso 2 de 3
      </p>
      <h2 className="text-2xl font-bold text-stone-900 mb-1">¿Para qué lo vas a usar?</h2>
      <p className="text-stone-500 text-sm mb-8">
        El uso define la configuración interior y el tipo de asesoramiento que te damos.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {FINALIDADES.map((f) => {
          const selected = finalidad === f.key;
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => onSelect(f.key)}
              className={`text-left rounded-xl border-2 p-4 transition-all duration-200 cursor-pointer ${
                selected
                  ? "border-sage-500 bg-sage-50 shadow-md shadow-sage-500/10"
                  : "border-stone-200 bg-white hover:border-sage-300 hover:shadow-sm"
              }`}
            >
              <span className="text-3xl block mb-3">{f.emoji}</span>
              <p
                className={`text-sm font-bold leading-tight ${
                  selected ? "text-sage-800" : "text-stone-800"
                }`}
              >
                {f.label}
              </p>
              <p
                className={`text-xs mt-1 leading-snug ${
                  selected ? "text-stone-600" : "text-stone-400"
                }`}
              >
                {f.desc}
              </p>
              {selected && (
                <span className="mt-2 inline-flex w-4 h-4 rounded-full bg-sage-500 items-center justify-center">
                  <CheckIcon className="w-2.5 h-2.5 text-white" />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Step 3 — Ubicación
// ─────────────────────────────────────────────────────────

function StepUbicacion({
  localidad,
  setLocalidad,
  provincia,
  setProvincia,
  regional,
}: {
  localidad: string;
  setLocalidad: (v: string) => void;
  provincia: string;
  setProvincia: (v: string) => void;
  regional: (typeof REGIONAL_MODELS)[string] | null;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-widest text-sage-600 mb-2">
        Paso 3 de 3
      </p>
      <h2 className="text-2xl font-bold text-stone-900 mb-1">¿Dónde lo instalás?</h2>
      <p className="text-stone-500 text-sm mb-8">
        Cada zona del país tiene requerimientos técnicos distintos. Los calculamos automáticamente.
      </p>

      <div className="space-y-5">
        <div>
          <label
            htmlFor="cfg-localidad"
            className="block text-sm font-semibold text-stone-700 mb-1.5"
          >
            Localidad
          </label>
          <input
            id="cfg-localidad"
            type="text"
            value={localidad}
            onChange={(e) => setLocalidad(e.target.value)}
            placeholder="Ej: Rosario, Mendoza, Bariloche…"
            maxLength={100}
            className="w-full px-4 py-3 rounded-xl border border-stone-200 hover:border-stone-300 focus:border-sage-400 focus:ring-2 focus:ring-sage-400/20 outline-none text-stone-900 text-sm placeholder:text-stone-400 transition-colors bg-white"
          />
        </div>

        <div>
          <label
            htmlFor="cfg-provincia"
            className="block text-sm font-semibold text-stone-700 mb-1.5"
          >
            Provincia <span className="text-sage-600">*</span>
          </label>
          <select
            id="cfg-provincia"
            value={provincia}
            onChange={(e) => setProvincia(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-stone-200 hover:border-stone-300 focus:border-sage-400 focus:ring-2 focus:ring-sage-400/20 outline-none text-stone-900 text-sm transition-colors bg-white"
          >
            <option value="">Seleccioná una provincia</option>
            {PROVINCIAS_AR.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        {/* Climate preview */}
        <AnimatePresence initial={false}>
          {regional && (
            <motion.div
              key={regional.key}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2 }}
              className="rounded-xl border border-sage-200 bg-sage-50 p-4"
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl shrink-0">{regional.icon}</span>
                <div>
                  <p className="text-sm font-semibold text-stone-800">
                    Zona climática: {regional.region}
                  </p>
                  <p className="text-xs text-stone-500 mt-0.5 leading-relaxed">
                    {regional.tagline}
                  </p>
                  <div className="mt-2 space-y-1">
                    {regional.extras.slice(0, 3).map((extra) => (
                      <div key={extra} className="flex items-center gap-1.5 text-xs text-stone-600">
                        <span className="w-3.5 h-3.5 rounded-full bg-sage-200 text-sage-700 flex items-center justify-center text-[9px] font-bold shrink-0">
                          ✓
                        </span>
                        {extra}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Result screen
// ─────────────────────────────────────────────────────────

function ResultScreen({
  modelo,
  finalidad,
  localidad,
  provincia,
  regional,
  waMessage,
  setWaMessage,
  onBack,
  onSend,
}: {
  modelo: ModeloKey;
  finalidad: FinalidadKey;
  localidad: string;
  provincia: string;
  regional: (typeof REGIONAL_MODELS)[string] | null;
  waMessage: string;
  setWaMessage: (v: string) => void;
  onBack: () => void;
  onSend: () => void;
}) {
  const m = MOVARA_MODELS.find((x) => x.key === modelo)!;
  const f = FINALIDADES.find((x) => x.key === finalidad)!;
  const loc = [localidad.trim(), provincia].filter(Boolean).join(", ");

  return (
    <div className="space-y-6">
      {/* Summary chips */}
      <div className="flex flex-wrap gap-2">
        <Chip icon="📦" text={`${m.nombre} — ${m.superficie}m²`} />
        <Chip icon={f.emoji} text={f.label} />
        {loc && <Chip icon="📍" text={loc} />}
        {regional && <Chip icon={regional.icon} text={regional.region} />}
      </div>

      {/* Price */}
      <div className="bg-sage-950 rounded-2xl p-6 text-center">
        <p className="text-xs uppercase tracking-widest text-stone-500 mb-2">Precio estimado</p>
        <p className="text-3xl font-bold text-white">
          USD {m.precio.min.toLocaleString("es-AR")}
          <span className="text-stone-400 text-xl font-normal mx-2">–</span>
          {m.precio.max.toLocaleString("es-AR")}
        </p>
        <p className="text-xs text-stone-500 mt-2">
          Incluye fabricación, transporte e instalación estándar
        </p>
      </div>

      {/* Climate upgrades */}
      {regional && (
        <div className="rounded-xl border border-stone-200 bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-stone-400 mb-3">
            Upgrades climáticos — {regional.region}
          </p>
          <div className="space-y-2.5">
            {[
              { label: "Panel", value: regional.panel },
              { label: "Ventanas", value: regional.ventanas },
              { label: "Climatización", value: regional.climatizacion },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-start gap-3 text-sm">
                <span className="text-stone-400 font-medium w-24 shrink-0">{label}</span>
                <span className="text-stone-700">{value}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t border-stone-100 space-y-1.5">
            {regional.extras.slice(0, 3).map((extra) => (
              <div key={extra} className="flex items-center gap-2 text-xs text-stone-600">
                <span className="w-4 h-4 rounded-full bg-sage-100 text-sage-600 flex items-center justify-center text-[10px] font-bold shrink-0">
                  ✓
                </span>
                {extra}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Editable WA message */}
      <div>
        <label className="block text-sm font-semibold text-stone-700 mb-1.5">
          Vista previa del mensaje de WhatsApp
        </label>
        <p className="text-xs text-stone-400 mb-2">Podés editarlo antes de enviar.</p>
        <textarea
          value={waMessage}
          onChange={(e) => setWaMessage(e.target.value)}
          rows={9}
          className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:border-sage-400 focus:ring-2 focus:ring-sage-400/20 outline-none text-stone-800 text-sm font-mono leading-relaxed resize-none transition-colors bg-stone-50"
        />
      </div>

      {/* CTAs */}
      <div className="space-y-3 pb-4">
        <button
          type="button"
          onClick={onSend}
          className="w-full flex items-center justify-center gap-2.5 py-4 bg-[#25D366] hover:bg-[#1fba58] text-white font-bold text-sm rounded-xl transition-all duration-200 hover:shadow-xl hover:shadow-green-500/25 hover:-translate-y-0.5"
        >
          <WhatsAppIcon className="w-5 h-5" />
          Enviar por WhatsApp
        </button>
        <button
          type="button"
          onClick={onBack}
          className="w-full py-3 border border-stone-200 hover:border-stone-300 text-stone-500 hover:text-stone-700 text-sm font-semibold rounded-xl transition-colors"
        >
          Modificar configuración
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Micro components
// ─────────────────────────────────────────────────────────

function Chip({ icon, text }: { icon: string; text: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-stone-200 rounded-full text-xs font-semibold text-stone-700">
      <span>{icon}</span>
      {text}
    </span>
  );
}

function ModuleIcon({ size, selected }: { size: ModeloKey; selected: boolean }) {
  const color = selected ? "#BF9A52" : "#a8a29e";
  const widths: Record<ModeloKey, number> = { "10ft": 28, "20ft": 44, "40ft": 60 };
  const w = widths[size];
  return (
    <svg width={w} height={28} viewBox={`0 0 ${w} 28`} fill="none">
      <rect x="1" y="6" width={w - 2} height="21" rx="2" stroke={color} strokeWidth="1.5" />
      <polyline
        points={`1,6 ${w / 2},1 ${w - 1},6`}
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {size !== "10ft" && (
        <line x1={w / 2} y1="6" x2={w / 2} y2="27" stroke={color} strokeWidth="1" />
      )}
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function ChevronLeftIcon() {
  return (
    <svg
      className="w-4 h-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2.5}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg
      className="w-4 h-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2.5}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}
