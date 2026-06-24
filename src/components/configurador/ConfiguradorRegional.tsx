"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { getWhatsAppUrl } from "@/lib/whatsapp";
import {
  REGIONAL_MODELS,
  PROVINCIA_A_MODELO,
  PEHUEN_PROVINCIAS,
  PROVINCIAS_AR,
} from "@/data/regional-models";
import {
  useConfiguradorStore,
  type ConfiguradorState,
  type ConfiguradorStore,
} from "@/store/configurador";
import { trackViewContent } from "@/lib/meta-pixel";

const TOTAL_STEPS = 3;

const USO_OPTS: {
  value: NonNullable<ConfiguradorState["uso"]>;
  label: string;
  icon: string;
  desc: string;
}[] = [
  { value: "vivienda", label: "Vivienda familiar", icon: "🏠", desc: "Mi hogar o el de mi familia" },
  { value: "turismo", label: "Turismo y alquiler", icon: "🌊", desc: "Airbnb, temporada o renta" },
  { value: "trabajo", label: "Trabajo y comercio", icon: "💼", desc: "Oficina, local o taller" },
];

const USO_LABELS: Record<string, string> = {
  vivienda: "Vivienda familiar",
  turismo: "Turismo y alquiler",
  trabajo: "Trabajo y comercio",
};

function buildWAMessage(
  provincia: string,
  modeloKey: string,
  uso: ConfiguradorState["uso"]
): string {
  const m = REGIONAL_MODELS[modeloKey];
  if (!m || !uso) return "";
  let msg = `Hola MOVARA! 👋 Usé el configurador regional y me recomendaron el modelo *${m.nombre}* para ${provincia}.\n\n`;
  msg += `📍 Zona: ${m.region}\n`;
  msg += `🎯 Uso: ${USO_LABELS[uso]}\n`;
  msg += `💰 Precio estimado: USD ${m.precioMin.toLocaleString("es-AR")} – ${m.precioMax.toLocaleString("es-AR")}\n\n`;
  msg += `🔧 Especificaciones para mi zona:\n`;
  msg += `• Panel: ${m.panel}\n`;
  msg += `• Ventanas: ${m.ventanas}\n`;
  msg += `• Climatización: ${m.climatizacion}\n\n`;
  msg += `Me interesa recibir más información y una cotización. ¡Gracias!`;
  return msg;
}

export default function ConfiguradorRegional({ waNumber }: { waNumber?: string | null }) {
  const c = useConfiguradorStore();
  const isResult = c.step === 4;

  useEffect(() => {
    if (c.open) trackViewContent("configurador-regional");
  }, [c.open]);

  useEffect(() => {
    if (!c.open) return;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") c.closeConfigurador();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [c.open, c.closeConfigurador]);

  const canProceed = useCallback((): boolean => {
    if (c.step === 1) return !!c.provincia;
    if (c.step === 2) return !!c.modeloKey;
    if (c.step === 3) return !!c.uso;
    return false;
  }, [c.step, c.provincia, c.modeloKey, c.uso]);

  const handleSend = () => {
    if (!c.provincia || !c.modeloKey || !c.uso) return;
    const msg = buildWAMessage(c.provincia, c.modeloKey, c.uso);
    window.open(getWhatsAppUrl(msg, waNumber), "_blank", "noopener,noreferrer");
  };

  return (
    <AnimatePresence>
      {c.open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) c.closeConfigurador();
          }}
        >
          <div className="absolute inset-0 bg-stone-950/70 backdrop-blur-sm" />

          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 16 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
          >
            {/* Header */}
            <div className="px-6 pt-6 pb-4 shrink-0">
              {!isResult && (
                <div className="flex gap-1.5 mb-4">
                  {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
                    <div
                      key={i}
                      className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                        i + 1 < c.step
                          ? "bg-sage-600"
                          : i + 1 === c.step
                          ? "bg-sage-400"
                          : "bg-stone-100"
                      }`}
                    />
                  ))}
                </div>
              )}
              <div className="flex items-center justify-between">
                {!isResult && (
                  <span className="text-xs font-semibold text-stone-400 uppercase tracking-widest">
                    Paso {c.step} de {TOTAL_STEPS}
                  </span>
                )}
                <button
                  onClick={c.closeConfigurador}
                  className="ml-auto w-8 h-8 rounded-full flex items-center justify-center text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition-colors"
                  aria-label="Cerrar"
                >
                  <XIcon />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 pb-2">
              <AnimatePresence mode="wait">
                <motion.div
                  key={c.step}
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                >
                  {c.step === 1 && <StepProvincia c={c} />}
                  {c.step === 2 && <StepModelo c={c} />}
                  {c.step === 3 && <StepUso c={c} />}
                  {c.step === 4 && (
                    <StepResultado c={c} onSend={handleSend} onClose={c.closeConfigurador} />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Footer nav */}
            {!isResult && (
              <div className="px-6 py-5 border-t border-stone-100 flex items-center gap-3 shrink-0">
                {c.step > 1 && (
                  <button
                    onClick={c.goBack}
                    className="flex items-center gap-1.5 px-4 py-2.5 text-stone-500 hover:text-stone-700 text-sm font-semibold transition-colors"
                  >
                    <ChevronLeftIcon /> Atrás
                  </button>
                )}
                <div className="flex-1" />
                <button
                  onClick={c.goNext}
                  disabled={!canProceed()}
                  className="flex items-center gap-1.5 px-6 py-2.5 bg-sage-600 hover:bg-sage-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold rounded-full transition-all duration-200 hover:shadow-lg hover:shadow-sage-600/25"
                >
                  {c.step === TOTAL_STEPS ? "Ver resultado" : "Siguiente"}
                  <ChevronRightIcon />
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ──────────────────────────────────────────────────────────────
// Steps
// ──────────────────────────────────────────────────────────────

function StepProvincia({ c }: { c: ConfiguradorStore }) {
  const handleChange = (prov: string) => {
    if (!prov) {
      c.setProvincia(null);
      c.setModeloKey(null, "provincia");
      return;
    }
    c.setProvincia(prov);
    c.setModeloKey(PROVINCIA_A_MODELO[prov] ?? "pampa", "provincia");
  };

  const preview = c.modeloKey ? REGIONAL_MODELS[c.modeloKey] : null;

  return (
    <div className="py-2 space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-sage-600 mb-2">
          Configurador Regional
        </p>
        <h2 className="text-xl font-bold text-stone-900">¿Dónde lo vas a instalar?</h2>
        <p className="text-sm text-stone-500 mt-1">
          Cada zona del país tiene requisitos técnicos distintos.
        </p>
      </div>

      <select
        value={c.provincia ?? ""}
        onChange={(e) => handleChange(e.target.value)}
        className="w-full px-4 py-3 rounded-xl border border-stone-200 hover:border-stone-300 focus:border-sage-400 focus:ring-2 focus:ring-sage-400/20 outline-none text-stone-900 text-sm transition-colors bg-white"
      >
        <option value="">Seleccioná una provincia</option>
        {PROVINCIAS_AR.map((p) => (
          <option key={p} value={p}>
            {p}
          </option>
        ))}
      </select>

      <AnimatePresence>
        {preview && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            className="flex items-center gap-4 p-4 bg-sage-50 border border-sage-100 rounded-xl"
          >
            <span className="text-3xl shrink-0">{preview.icon}</span>
            <div>
              <p className="text-sm font-semibold text-stone-800">Zona: {preview.region}</p>
              <p className="text-xs text-stone-500 mt-0.5">
                Modelo sugerido:{" "}
                <span className="font-semibold text-sage-700">{preview.nombre}</span>
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StepModelo({ c }: { c: ConfiguradorStore }) {
  const [showAll, setShowAll] = useState(false);
  const modelo = c.modeloKey ? REGIONAL_MODELS[c.modeloKey] : null;
  const isPehuenZone = c.provincia ? PEHUEN_PROVINCIAS.includes(c.provincia) : false;

  return (
    <div className="py-2 space-y-4">
      <div>
        <h2 className="text-xl font-bold text-stone-900">Tu modelo recomendado</h2>
        <p className="text-sm text-stone-500 mt-1">
          Basado en las condiciones climáticas de {c.provincia}.
        </p>
      </div>

      {modelo && (
        <div className="p-5 bg-sage-50 border-2 border-sage-200 rounded-2xl">
          <div className="flex items-start gap-4">
            <span className="text-4xl shrink-0">{modelo.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center flex-wrap gap-2">
                <h3 className="text-lg font-bold text-stone-900">{modelo.nombre}</h3>
                <span className="px-2 py-0.5 bg-sage-100 text-sage-700 text-xs font-semibold rounded-full">
                  {modelo.region}
                </span>
                {c.fuenteSeleccion === "manual" && (
                  <span className="px-2 py-0.5 bg-stone-100 text-stone-500 text-xs rounded-full">
                    Manual
                  </span>
                )}
              </div>
              <p className="text-sm text-stone-600 mt-1 leading-relaxed">{modelo.tagline}</p>
              <div className="mt-3 space-y-1.5">
                <p className="text-xs text-stone-500">
                  <span className="font-semibold text-stone-700">Panel:</span> {modelo.panel}
                </p>
                <p className="text-xs text-stone-500">
                  <span className="font-semibold text-stone-700">Climatización:</span>{" "}
                  {modelo.climatizacion}
                </p>
              </div>
              <p className="mt-3 text-sm font-bold text-sage-700">
                USD {modelo.precioMin.toLocaleString("es-AR")} –{" "}
                {modelo.precioMax.toLocaleString("es-AR")}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Pehuen zone hint */}
      {isPehuenZone && c.modeloKey !== "pehuen" && (
        <div className="p-4 bg-sky-50 border border-sky-200 rounded-xl">
          <p className="text-sm font-semibold text-sky-800">¿Estás en zona cordillerana?</p>
          <p className="text-xs text-sky-700 mt-1 leading-relaxed">
            Para Bariloche, San Martín de los Andes, Esquel o Villa La Angostura, el modelo{" "}
            <strong>Pehuén</strong> es más adecuado.
          </p>
          <button
            onClick={() => c.setModeloKey("pehuen", "manual")}
            className="mt-2 text-xs font-bold text-sky-700 hover:text-sky-900 underline underline-offset-2 transition-colors"
          >
            ❄️ Elegir modelo Pehuén
          </button>
        </div>
      )}

      {/* Toggle all models */}
      <button
        onClick={() => setShowAll((v) => !v)}
        className="w-full text-sm text-stone-500 hover:text-stone-700 py-1.5 flex items-center justify-center gap-1.5 transition-colors"
      >
        {showAll ? <ChevronUpIcon /> : <ChevronDownIcon />}
        {showAll ? "Ocultar modelos" : "Elegir otro modelo"}
      </button>

      <AnimatePresence>
        {showAll && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            className="grid grid-cols-2 gap-2 pb-2"
          >
            {Object.values(REGIONAL_MODELS).map((m) => {
              const isSelected = c.modeloKey === m.key;
              return (
                <button
                  key={m.key}
                  onClick={() => c.setModeloKey(m.key, "manual")}
                  className={`text-left p-3.5 rounded-xl border-2 transition-all duration-200 ${
                    isSelected
                      ? "border-sage-500 bg-sage-50"
                      : "border-stone-100 hover:border-stone-200 bg-stone-50"
                  }`}
                >
                  <span className="text-2xl block mb-1.5">{m.icon}</span>
                  <p
                    className={`text-sm font-bold leading-tight ${
                      isSelected ? "text-sage-800" : "text-stone-800"
                    }`}
                  >
                    {m.nombre}
                  </p>
                  <p className="text-xs text-stone-500 mt-0.5 leading-tight">{m.region}</p>
                  <p
                    className={`text-xs font-semibold mt-2 ${
                      isSelected ? "text-sage-600" : "text-stone-400"
                    }`}
                  >
                    USD {m.precioMin.toLocaleString("es-AR")}+
                  </p>
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StepUso({ c }: { c: ConfiguradorStore }) {
  return (
    <div className="py-2">
      <h2 className="text-xl font-bold text-stone-900 mb-2">¿Para qué lo vas a usar?</h2>
      <p className="text-sm text-stone-500 mb-6">
        El uso define la configuración interior y el equipamiento incluido.
      </p>
      <div className="space-y-3">
        {USO_OPTS.map(({ value, label, icon, desc }) => (
          <button
            key={value}
            onClick={() => c.setUso(value)}
            className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 flex items-center gap-4 ${
              c.uso === value
                ? "border-sage-500 bg-sage-50"
                : "border-stone-100 hover:border-stone-200 bg-stone-50"
            }`}
          >
            <span className="text-3xl shrink-0">{icon}</span>
            <div>
              <p
                className={`text-sm font-bold ${
                  c.uso === value ? "text-sage-800" : "text-stone-800"
                }`}
              >
                {label}
              </p>
              <p className="text-xs text-stone-500 mt-0.5">{desc}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function StepResultado({
  c,
  onSend,
  onClose,
}: {
  c: ConfiguradorStore;
  onSend: () => void;
  onClose: () => void;
}) {
  const modelo = c.modeloKey ? REGIONAL_MODELS[c.modeloKey] : null;
  if (!modelo) return null;

  return (
    <div className="py-4 space-y-5">
      {/* Header */}
      <div className="text-center">
        <div className="w-16 h-16 rounded-full bg-sage-100 flex items-center justify-center mx-auto mb-3 text-3xl">
          {modelo.icon}
        </div>
        <p className="text-xs font-semibold uppercase tracking-widest text-sage-600 mb-1">
          Tu modelo regional
        </p>
        <h2 className="text-2xl font-bold text-stone-900">{modelo.nombre}</h2>
        <span className="inline-block mt-2 px-3 py-1 bg-sage-100 text-sage-700 text-xs font-semibold rounded-full">
          {modelo.region}
        </span>
        <p className="text-sm text-stone-500 mt-3 max-w-xs mx-auto leading-relaxed">
          {modelo.tagline}
        </p>
      </div>

      {/* Price */}
      <div className="bg-stone-950 rounded-2xl p-5 text-center">
        <p className="text-xs text-stone-500 uppercase tracking-widest mb-1.5">Precio estimado</p>
        <p className="text-2xl font-bold text-white">
          USD {modelo.precioMin.toLocaleString("es-AR")} – {modelo.precioMax.toLocaleString("es-AR")}
        </p>
        <p className="text-xs text-stone-500 mt-1.5">
          Incluye transporte e instalación estándar · {c.provincia}
        </p>
      </div>

      {/* Specs */}
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-stone-400">
          Especificaciones para tu zona
        </p>
        <div className="space-y-2">
          {[
            { label: "Panel", value: modelo.panel },
            { label: "Ventanas", value: modelo.ventanas },
            { label: "Climatización", value: modelo.climatizacion },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-start gap-3 p-3 bg-stone-50 rounded-xl">
              <span className="text-xs font-semibold text-stone-500 w-24 shrink-0 pt-0.5">
                {label}
              </span>
              <span className="text-xs text-stone-800 font-medium leading-relaxed">{value}</span>
            </div>
          ))}
        </div>

        <div className="space-y-2 pt-1">
          {modelo.extras.slice(0, 3).map((extra) => (
            <div key={extra} className="flex items-center gap-2.5 text-xs text-stone-600">
              <span className="w-4 h-4 rounded-full bg-sage-100 text-sage-700 flex items-center justify-center text-[10px] shrink-0 font-bold">
                ✓
              </span>
              {extra}
            </div>
          ))}
        </div>
      </div>

      {/* Context */}
      <div className="flex items-center gap-2 text-xs text-stone-400 pt-1">
        <span>📍 {c.provincia}</span>
        <span>·</span>
        <span>{c.uso ? USO_LABELS[c.uso] : ""}</span>
        {c.fuenteSeleccion === "manual" && (
          <>
            <span>·</span>
            <span>Selección manual</span>
          </>
        )}
      </div>

      {/* CTAs */}
      <div className="space-y-3 pb-2">
        <button
          onClick={onSend}
          className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-green-600 hover:bg-green-700 text-white text-sm font-bold rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-green-600/20"
        >
          <WhatsAppIcon className="w-5 h-5" />
          Consultar por WhatsApp
        </button>
        <Link
          href="/modelos"
          onClick={onClose}
          className="w-full flex items-center justify-center gap-1.5 px-6 py-3 border border-stone-200 hover:border-stone-300 text-stone-600 hover:text-stone-800 text-sm font-semibold rounded-xl transition-colors"
        >
          Ver catálogo completo
          <ChevronRightIcon />
        </Link>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Icons
// ──────────────────────────────────────────────────────────────

function XIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
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

function ChevronDownIcon() {
  return (
    <svg
      className="w-4 h-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2.5}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function ChevronUpIcon() {
  return (
    <svg
      className="w-4 h-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2.5}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
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
