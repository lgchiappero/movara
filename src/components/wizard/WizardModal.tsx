"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useWizardStore, buildWhatsAppMessage, type WizardModel, type WizardStore } from "@/store/wizard";
import { CATEGORY_LABELS } from "@/data/models";

const TOTAL_STEPS = 6;

const PROVINCIAS = [
  "Buenos Aires", "Ciudad Autónoma de Buenos Aires", "Catamarca", "Chaco",
  "Chubut", "Córdoba", "Corrientes", "Entre Ríos", "Formosa", "Jujuy",
  "La Pampa", "La Rioja", "Mendoza", "Misiones", "Neuquén", "Río Negro",
  "Salta", "San Juan", "San Luis", "Santa Cruz", "Santa Fe",
  "Santiago del Estero", "Tierra del Fuego", "Tucumán",
];

const USO_OPTIONS = [
  { value: "familiar",  label: "Vivienda familiar",  icon: "🏠", desc: "Mi hogar o el de mi familia" },
  { value: "turistico", label: "Alquiler turístico",  icon: "🌊", desc: "Airbnb, temporada o renta" },
  { value: "oficina",   label: "Oficina en casa",     icon: "💼", desc: "Trabajo desde mi terreno" },
  { value: "otro",      label: "Otro",                icon: "✨", desc: "Otro tipo de uso" },
];

export default function WizardModal({ waNumber }: { waNumber?: string | null }) {
  const w = useWizardStore();
  const [editableMsg, setEditableMsg] = useState("");
  const [sent, setSent] = useState(false);

  // Generate editable message when entering step 6
  useEffect(() => {
    if (w.step === 6) setEditableMsg(buildWhatsAppMessage(w));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [w.step]);

  // Body scroll lock + Escape key
  useEffect(() => {
    if (!w.open) { setSent(false); return; }
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") w.closeWizard(); };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [w.open, w.closeWizard]);

  const canProceed = useCallback((): boolean => {
    switch (w.step) {
      case 1: return true;
      case 2: return w.habitaciones !== null && w.cocina !== null && w.banio !== null && (w.banio === false || w.banioAdicional !== null);
      case 3: return w.ciudad.trim().length > 0 && w.provincia.length > 0;
      case 4: return w.uso !== null;
      case 5: return true;
      case 6: return editableMsg.trim().length > 0;
      default: return false;
    }
  }, [w, editableMsg]);

  const handleSend = () => {
    const number = waNumber || process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "5491100000000";
    const url = `https://wa.me/${number}?text=${encodeURIComponent(editableMsg)}`;
    window.open(url, "_blank", "noopener,noreferrer");
    setSent(true);
  };

  return (
    <AnimatePresence>
      {w.open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) w.closeWizard(); }}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-stone-950/70 backdrop-blur-sm" />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 16 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
          >
            {/* Header */}
            <div className="px-6 pt-6 pb-4 shrink-0">
              {/* Progress bar */}
              {!sent && (
                <div className="flex gap-1.5 mb-4">
                  {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
                    <div
                      key={i}
                      className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                        i + 1 < w.step
                          ? "bg-sage-600"
                          : i + 1 === w.step
                          ? "bg-sage-400"
                          : "bg-stone-100"
                      }`}
                    />
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between">
                {!sent && (
                  <span className="text-xs font-semibold text-stone-400 uppercase tracking-widest">
                    Paso {w.step} de {TOTAL_STEPS}
                  </span>
                )}
                <button
                  onClick={w.closeWizard}
                  className="ml-auto w-8 h-8 rounded-full flex items-center justify-center text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition-colors"
                  aria-label="Cerrar"
                >
                  <XIcon />
                </button>
              </div>
            </div>

            {/* Step content */}
            <div className="flex-1 overflow-y-auto px-6 pb-2">
              <AnimatePresence mode="wait">
                <motion.div
                  key={sent ? "sent" : w.step}
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                >
                  {sent ? (
                    <SentScreen onClose={w.closeWizard} />
                  ) : (
                    <>
                      {w.step === 1 && <Step1 model={w.model} />}
                      {w.step === 2 && <Step2 w={w} />}
                      {w.step === 3 && <Step3 w={w} />}
                      {w.step === 4 && <Step4 w={w} />}
                      {w.step === 5 && <Step5 w={w} />}
                      {w.step === 6 && (
                        <Step6
                          message={editableMsg}
                          onChange={setEditableMsg}
                          onSend={handleSend}
                        />
                      )}
                    </>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Footer nav */}
            {!sent && (
              <div className="px-6 py-5 border-t border-stone-100 flex items-center gap-3 shrink-0">
                {w.step > 1 && (
                  <button
                    onClick={w.goBack}
                    className="flex items-center gap-1.5 px-4 py-2.5 text-stone-500 hover:text-stone-700 text-sm font-semibold transition-colors"
                  >
                    <ChevronLeftIcon /> Atrás
                  </button>
                )}
                <div className="flex-1" />
                {w.step < TOTAL_STEPS ? (
                  <button
                    onClick={w.goNext}
                    disabled={!canProceed()}
                    className="flex items-center gap-1.5 px-6 py-2.5 bg-sage-600 hover:bg-sage-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold rounded-full transition-all duration-200 hover:shadow-lg hover:shadow-sage-600/25"
                  >
                    Siguiente <ChevronRightIcon />
                  </button>
                ) : (
                  <button
                    onClick={handleSend}
                    disabled={!canProceed()}
                    className="flex items-center gap-2 px-6 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold rounded-full transition-all duration-200 hover:shadow-lg hover:shadow-green-600/20"
                  >
                    <WhatsAppIcon className="w-4 h-4" />
                    Abrir WhatsApp
                  </button>
                )}
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

function Step1({ model }: { model: WizardModel | null }) {
  return (
    <div className="py-2">
      <p className="text-xs font-semibold uppercase tracking-widest text-sage-600 mb-2">
        Modelo seleccionado
      </p>
      <h2 className="text-2xl font-bold text-stone-900 mb-1">{model?.name}</h2>
      <p className="text-sm text-stone-500 mb-6">
        {CATEGORY_LABELS[model?.category as keyof typeof CATEGORY_LABELS] ?? model?.category}
      </p>

      <div className="bg-sage-50 border border-sage-100 rounded-xl p-5 flex items-start gap-4">
        <span className="text-3xl">🏠</span>
        <div>
          <p className="font-semibold text-stone-800">¿Es el modelo que te interesa?</p>
          <p className="text-sm text-stone-500 mt-1">
            En los próximos pasos vas a poder configurar cantidad de habitaciones,
            cocina, baño y más. Todo es personalizable.
          </p>
        </div>
      </div>
    </div>
  );
}

function Step2({ w }: { w: WizardStore }) {
  const toggle = (val: boolean, current: boolean | null, setter: (v: boolean) => void) =>
    setter(current === val ? (null as unknown as boolean) : val);

  return (
    <div className="py-2 space-y-7">
      <h2 className="text-xl font-bold text-stone-900">Configuración del módulo</h2>

      {/* Habitaciones */}
      <div>
        <label className="text-sm font-semibold text-stone-700 block mb-3">
          ¿Cuántas habitaciones necesitás?
        </label>
        <div className="grid grid-cols-4 gap-2">
          {[1, 2, 3, 4].map((n) => (
            <button
              key={n}
              onClick={() => w.setHabitaciones(n)}
              className={`py-3 rounded-xl text-lg font-bold border-2 transition-all duration-200 ${
                w.habitaciones === n
                  ? "border-sage-500 bg-sage-50 text-sage-700"
                  : "border-stone-200 text-stone-600 hover:border-stone-300"
              }`}
            >
              {n === 4 ? "4+" : n}
            </button>
          ))}
        </div>
      </div>

      {/* Cocina */}
      <div>
        <label className="text-sm font-semibold text-stone-700 block mb-3">
          ¿Incluye cocina?
        </label>
        <BooleanToggle value={w.cocina} onChange={(v) => toggle(v, w.cocina, w.setCocina)} />
      </div>

      {/* Baño */}
      <div>
        <label className="text-sm font-semibold text-stone-700 block mb-3">
          ¿Incluye baño?
        </label>
        <BooleanToggle value={w.banio} onChange={(v) => toggle(v, w.banio, w.setBanio)} />
      </div>

      {/* Baño adicional (condicional) */}
      {w.banio === true && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          <label className="text-sm font-semibold text-stone-700 block mb-3">
            ¿Necesitás un baño adicional?
          </label>
          <BooleanToggle
            value={w.banioAdicional}
            onChange={(v) => toggle(v, w.banioAdicional, w.setBanioAdicional)}
          />
        </motion.div>
      )}
    </div>
  );
}

function Step3({ w }: { w: WizardStore }) {
  return (
    <div className="py-2 space-y-5">
      <h2 className="text-xl font-bold text-stone-900">¿Dónde lo querés instalar?</h2>
      <p className="text-sm text-stone-500">
        Nos ayuda a estimar los costos de transporte e instalación.
      </p>

      <div className="space-y-4">
        <div>
          <label className="text-sm font-semibold text-stone-700 block mb-1.5">Ciudad</label>
          <input
            type="text"
            value={w.ciudad}
            onChange={(e) => w.setCiudad(e.target.value)}
            maxLength={100}
            placeholder="ej. Mar del Plata"
            className="w-full px-4 py-3 rounded-xl border border-stone-200 hover:border-stone-300 focus:border-sage-400 focus:ring-2 focus:ring-sage-400/20 outline-none text-stone-900 placeholder:text-stone-400 text-sm transition-colors"
          />
        </div>

        <div>
          <label className="text-sm font-semibold text-stone-700 block mb-1.5">Provincia</label>
          <select
            value={w.provincia}
            onChange={(e) => w.setProvincia(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-stone-200 hover:border-stone-300 focus:border-sage-400 focus:ring-2 focus:ring-sage-400/20 outline-none text-stone-900 text-sm transition-colors bg-white"
          >
            <option value="">Seleccioná una provincia</option>
            {PROVINCIAS.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

function Step4({ w }: { w: WizardStore }) {
  return (
    <div className="py-2">
      <h2 className="text-xl font-bold text-stone-900 mb-2">¿Para qué lo vas a usar?</h2>
      <p className="text-sm text-stone-500 mb-6">Elegí la opción que mejor describe tu proyecto.</p>

      <div className="grid grid-cols-2 gap-3">
        {USO_OPTIONS.map(({ value, label, icon, desc }) => (
          <button
            key={value}
            onClick={() => w.setUso(value)}
            className={`text-left p-4 rounded-xl border-2 transition-all duration-200 ${
              w.uso === value
                ? "border-sage-500 bg-sage-50"
                : "border-stone-100 hover:border-stone-200 bg-stone-50"
            }`}
          >
            <span className="text-2xl block mb-2">{icon}</span>
            <p className={`text-sm font-bold ${w.uso === value ? "text-sage-800" : "text-stone-800"}`}>
              {label}
            </p>
            <p className="text-xs text-stone-500 mt-0.5">{desc}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

function Step5({ w }: { w: WizardStore }) {
  return (
    <div className="py-2">
      <h2 className="text-xl font-bold text-stone-900 mb-1">¿Alguna consulta adicional?</h2>
      <p className="text-sm text-stone-500 mb-5">
        Este campo es opcional. Podés preguntar sobre financiación, plazos, terreno, etc.
      </p>

      <textarea
        rows={5}
        value={w.consulta}
        onChange={(e) => w.setConsulta(e.target.value)}
        maxLength={1000}
        placeholder="ej. Tengo un terreno de 200 m² en esquina. ¿Necesito hacer platea? ¿Hay financiación en pesos?"
        className="w-full px-4 py-3 rounded-xl border border-stone-200 hover:border-stone-300 focus:border-sage-400 focus:ring-2 focus:ring-sage-400/20 outline-none text-stone-900 placeholder:text-stone-400 text-sm resize-none transition-colors"
      />

      <p className="text-xs text-stone-400 mt-2">
        Tu mensaje va a llegar directamente a nuestro equipo de ventas.
      </p>
    </div>
  );
}

function Step6({
  message,
  onChange,
  onSend,
}: {
  message: string;
  onChange: (v: string) => void;
  onSend: () => void;
}) {
  return (
    <div className="py-2">
      <h2 className="text-xl font-bold text-stone-900 mb-1">
        Revisá tu mensaje antes de enviarlo
      </h2>
      <p className="text-sm text-stone-500 mb-4">
        Podés editar el texto si querés agregar algo.
      </p>

      <div className="relative">
        <textarea
          rows={9}
          value={message}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:border-sage-400 focus:ring-2 focus:ring-sage-400/20 outline-none text-stone-700 text-sm leading-relaxed resize-none font-mono transition-colors"
        />
        <div className="absolute top-2.5 right-3 text-[10px] text-stone-300 font-mono">
          editable
        </div>
      </div>

      {/* Trust indicators */}
      <div className="mt-4 space-y-2">
        <div className="flex items-center gap-2 text-xs text-stone-500">
          <span>⏰</span>
          <span>Respondemos en menos de 2 horas en horario comercial</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-stone-500">
          <span>🔒</span>
          <span>Tu consulta es privada y no se almacena en nuestros servidores</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-stone-500">
          <span>💚</span>
          <span>El botón va a abrir WhatsApp con este mensaje listo para enviar</span>
        </div>
      </div>
    </div>
  );
}

function SentScreen({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-5">
        <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h3 className="text-xl font-bold text-stone-900">¡Listo! Se abrió WhatsApp</h3>
      <p className="mt-2 text-sm text-stone-500 max-w-xs">
        Enviá el mensaje cuando quieras. Te respondemos en menos de 2 horas en
        horario comercial.
      </p>
      <button
        onClick={onClose}
        className="mt-8 px-6 py-2.5 bg-stone-900 hover:bg-stone-800 text-white text-sm font-semibold rounded-full transition-colors"
      >
        Cerrar
      </button>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Sub-components
// ──────────────────────────────────────────────────────────────

function BooleanToggle({
  value,
  onChange,
}: {
  value: boolean | null;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex gap-3">
      {[true, false].map((opt) => (
        <button
          key={String(opt)}
          onClick={() => onChange(opt)}
          className={`flex-1 py-2.5 rounded-xl text-sm font-bold border-2 transition-all duration-200 ${
            value === opt
              ? opt
                ? "border-sage-500 bg-sage-50 text-sage-700"
                : "border-stone-400 bg-stone-100 text-stone-700"
              : "border-stone-200 text-stone-500 hover:border-stone-300"
          }`}
        >
          {opt ? "Sí" : "No"}
        </button>
      ))}
    </div>
  );
}

function XIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function ChevronLeftIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
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
