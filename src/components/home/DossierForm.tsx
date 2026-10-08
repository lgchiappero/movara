"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, FileCheck, Lock, ArrowLeft, ArrowRight, Phone } from "lucide-react";
import { getWhatsAppUrl } from "@/lib/whatsapp";
import AvisoPrivacidad from "@/components/legal/AvisoPrivacidad";

// ─── Constants ───────────────────────────────────────────────────────────────

const PROVINCIAS = [
  "Buenos Aires", "Ciudad Autónoma de Buenos Aires", "Catamarca", "Chaco",
  "Chubut", "Córdoba", "Corrientes", "Entre Ríos", "Formosa", "Jujuy",
  "La Pampa", "La Rioja", "Mendoza", "Misiones", "Neuquén", "Río Negro",
  "Salta", "San Juan", "San Luis", "Santa Cruz", "Santa Fe",
  "Santiago del Estero", "Tierra del Fuego", "Tucumán",
];

const TEMP_DOMAINS = new Set([
  "mailinator.com", "tempmail.com", "yopmail.com", "guerrillamail.com",
  "10minutemail.com", "throwaway.email", "fakeinbox.com", "trashmail.com",
  "mailnull.com", "spamgourmet.com", "dispostable.com", "maildrop.cc",
  "sharklasers.com", "guerrillamailblock.com", "spam4.me", "trashmail.at",
  "trashmail.io", "wegwerfmail.de", "mailnesia.com", "tempinbox.com",
]);

// ─── Validation ──────────────────────────────────────────────────────────────

function validateEmail(email: string): string | null {
  if (!email.trim()) return "El email es requerido";
  const re = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  if (!re.test(email)) return "Ingresá un email válido";
  const domain = email.split("@")[1]?.toLowerCase() ?? "";
  if (TEMP_DOMAINS.has(domain)) return "No aceptamos emails temporales";
  return null;
}

function validateTelefono(tel: string): string | null {
  if (!tel.trim()) return "El teléfono es requerido";
  if (!/^[0-9\s\-+]+$/.test(tel)) return "Solo números, espacios, guiones y +";
  const digits = tel.replace(/\D/g, "");
  if (digits.length < 8) return "Mínimo 8 dígitos";
  if (digits.length > 15) return "Máximo 15 dígitos";
  if (/^(\d)\1+$/.test(digits)) return "Ingresá un teléfono válido";
  const isSeq = [...digits].every((d, i, a) => i === 0 || Number(d) - Number(a[i - 1]) === 1);
  if (isSeq && digits.length >= 8) return "Ingresá un teléfono válido";
  return null;
}

function validateDNI(dni: string): string | null {
  if (!dni.trim()) return "El DNI es requerido";
  if (!/^\d{7,8}$/.test(dni)) return "Solo números, 7 u 8 dígitos (sin puntos ni espacios)";
  return null;
}

// ─── Types ───────────────────────────────────────────────────────────────────

type Form = {
  nombre: string;
  apellido: string;
  dni: string;
  telefono: string;
  email: string;
  provincia: string;
  terreno: string;
  uso: string;
  presupuesto: string;
  cuando: string;
  consulta: string;
};

type ValidatableField = "email" | "telefono" | "dni";
type FieldErrors = Partial<Record<ValidatableField, string | null>>;

const EMPTY: Form = {
  nombre: "", apellido: "", dni: "", telefono: "", email: "",
  provincia: "", terreno: "", uso: "", presupuesto: "", cuando: "", consulta: "",
};

type DossierContent = {
  titulo?: string;
  subtitulo?: string;
  items?: string[];
  textoCTA?: string;
};

const DEFAULT_ITEMS = [
  "Modelos completos con planos y especificaciones técnicas",
  "Configuraciones premium y opciones de personalización",
  "Comparativa técnica vs. construcción tradicional",
  "Escenarios de inversión Airbnb con proyección de ROI",
  "Condiciones exclusivas de preventa y lanzamiento",
  "Acceso a asesoramiento privado con nuestro equipo",
];

const TOTAL_STEPS = 3;

// ─── Style helpers ────────────────────────────────────────────────────────────

const baseInput = "w-full bg-white/5 border text-white placeholder-stone-600 rounded-xl px-4 py-3 text-sm focus:outline-none transition-colors";
const selectCls = "w-full bg-[#2F2F2F] border border-white/10 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#D4B06A]/50 transition-colors appearance-none";

function inputCls(errors: FieldErrors, key: ValidatableField) {
  const err = errors[key];
  if (err === undefined) return `${baseInput} border-white/10 focus:border-[#D4B06A]/50`;
  if (err) return `${baseInput} border-red-500/70 focus:border-red-500`;
  return `${baseInput} border-green-500/50 focus:border-green-500`;
}

const plainInputCls = `${baseInput} border-white/10 focus:border-[#D4B06A]/50`;

// ─── WhatsApp icon ────────────────────────────────────────────────────────────

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

// ─── Trust signals ────────────────────────────────────────────────────────────

function TrustRow({ className = "" }: { className?: string }) {
  const items = [
    { icon: ShieldCheck, label: "Certificación CE" },
    { icon: FileCheck, label: "Garantía escrita" },
    { icon: Lock, label: "Datos confidenciales" },
  ];
  return (
    <div className={`flex flex-wrap items-center gap-x-5 gap-y-2 ${className}`}>
      {items.map(({ icon: Icon, label }) => (
        <span key={label} className="inline-flex items-center gap-1.5 text-stone-500 text-[11px] font-medium">
          <Icon size={13} className="text-[#D4B06A]/70 shrink-0" />
          {label}
        </span>
      ))}
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function DossierForm({
  waNumber,
  content,
}: {
  waNumber?: string | null;
  content?: DossierContent | null;
}) {
  const [form, setForm] = useState<Form>(EMPTY);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [sentVia, setSentVia] = useState<"form" | "llamada">("form");
  const [step, setStep] = useState(1);
  const [step1Touched, setStep1Touched] = useState(false);
  const [quickCallTouched, setQuickCallTouched] = useState(false);

  // Generic field setter
  const set = (k: keyof Form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const value = e.target.value;
      setForm(f => ({ ...f, [k]: value }));
      // Revalidate on change if field was already touched
      if (k === "email" || k === "telefono" || k === "dni") {
        const vk = k as ValidatableField;
        if (errors[vk] !== undefined) {
          const fn = vk === "email" ? validateEmail : vk === "telefono" ? validateTelefono : validateDNI;
          setErrors(prev => ({ ...prev, [vk]: fn(value) }));
        }
      }
    };

  const handleBlur = (key: ValidatableField) => () => {
    const fn = key === "email" ? validateEmail : key === "telefono" ? validateTelefono : validateDNI;
    setErrors(prev => ({ ...prev, [key]: fn(form[key]) }));
  };

  const goNext = () => {
    if (step === 1) {
      if (!form.provincia) { setStep1Touched(true); return; }
    }
    setStep(s => Math.min(TOTAL_STEPS, s + 1));
  };

  const goBack = () => setStep(s => Math.max(1, s - 1));

  const buildMensaje = (extra?: string) =>
    [
      form.uso && `Uso: ${form.uso}`,
      form.terreno && `Terreno: ${form.terreno}`,
      form.presupuesto && `Presupuesto: ${form.presupuesto}`,
      form.cuando && `Instalación: ${form.cuando}`,
      form.consulta && `Consulta: ${form.consulta}`,
      extra,
      "Origen: Carpeta de proyecto",
    ].filter(Boolean).join(" | ");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all required fields
    const emailErr = validateEmail(form.email);
    const telErr = validateTelefono(form.telefono);
    const dniErr = validateDNI(form.dni);
    setErrors({ email: emailErr, telefono: telErr, dni: dniErr });
    if (emailErr || telErr || dniErr) return;

    setStatus("sending");

    try {
      await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: form.nombre,
          apellido: form.apellido || undefined,
          dni: form.dni || undefined,
          telefono: form.telefono,
          email: form.email || undefined,
          provincia: form.provincia || undefined,
          mensaje: buildMensaje(),
          formulario: "dossier",
        }),
      });
    } catch (err) {
      console.error("[DossierForm] submit error:", err);
    }

    setSentVia("form");
    setStatus("sent");
  };

  // Camino alternativo del Paso 3: para el lead que llegó hasta acá pero no
  // quiere terminar de tipear DNI/email — reutiliza el mismo endpoint, solo
  // con menos campos (nombre + teléfono, que es todo lo que /api/leads exige).
  const handleQuickCall = async () => {
    const telErr = validateTelefono(form.telefono);
    const nombreOk = form.nombre.trim().length > 0;
    setErrors(prev => ({ ...prev, telefono: telErr }));
    setQuickCallTouched(true);
    if (telErr || !nombreOk) return;

    setStatus("sending");

    try {
      await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: form.nombre,
          apellido: form.apellido || undefined,
          telefono: form.telefono,
          email: form.email || undefined,
          provincia: form.provincia || undefined,
          mensaje: buildMensaje("Prefiere que lo llamen (no completó el formulario completo)"),
          formulario: "dossier-llamada",
        }),
      });
    } catch (err) {
      console.error("[DossierForm] quick-call submit error:", err);
    }

    setSentVia("llamada");
    setStatus("sent");
  };

  const resetAll = () => {
    setForm(EMPTY);
    setErrors({});
    setStatus("idle");
    setStep(1);
    setStep1Touched(false);
    setQuickCallTouched(false);
  };

  const waMsgAsesor = "Hola MOVARA! Quiero hablar con un asesor sobre el precio de lanzamiento.";
  const waMsgPostForm = `Hola MOVARA! 👋 Mi nombre es ${[form.nombre, form.apellido].filter(Boolean).join(" ")}. Completé el formulario en el sitio y me interesa recibir información sobre precio de lanzamiento.${form.email ? ` Mi email es ${form.email}` : ""}${form.telefono ? ` y mi teléfono es ${form.telefono}` : ""}.`;

  return (
    <section id="dossier" className="py-32 bg-[#2F2F2F]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Intro compartida */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-2xl mx-auto text-center mb-12"
        >
          <span className="text-[#D4B06A] text-xs font-semibold uppercase tracking-widest mb-4 block">
            Carpeta de proyecto
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-white leading-tight mb-4">
            {content?.titulo ?? "Accedé a la información completa MOVARA."}
          </h2>
          <p className="text-stone-400 text-base leading-relaxed">
            {content?.subtitulo ??
              "Completá el formulario y un asesor MOVARA te contacta a la brevedad."}
          </p>
        </motion.div>

        {/* ── PRIMARIO — hablar con un asesor ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="max-w-2xl mx-auto mb-10 bg-gradient-to-b from-[#D4B06A]/10 to-transparent border border-[#D4B06A]/25 rounded-3xl p-8 sm:p-10 text-center"
        >
          <div className="w-14 h-14 rounded-full bg-[#D4B06A]/15 flex items-center justify-center mx-auto mb-5">
            <Phone size={22} className="text-[#D4B06A]" strokeWidth={2} />
          </div>
          <h3 className="text-white font-bold text-2xl mb-2">Hablá con un asesor ahora</h3>
          <p className="text-stone-300 text-sm max-w-sm mx-auto mb-7 leading-relaxed">
            La vía más rápida para acceder al precio de lanzamiento. Sin formularios: respuesta directa por WhatsApp.
          </p>
          <a
            href={getWhatsAppUrl(waMsgAsesor, waNumber)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2.5 px-9 py-4 bg-[#D4B06A] hover:bg-[#BF9A52] text-[#1A1A1A] font-bold rounded-xl transition-all duration-200 hover:shadow-2xl hover:shadow-[#D4B06A]/20 hover:-translate-y-0.5 text-sm tracking-wide"
          >
            <WhatsAppIcon className="w-4 h-4" />
            Hablar con un asesor
          </a>
          <TrustRow className="justify-center mt-7" />
        </motion.div>

        {/* Separador */}
        <div className="flex items-center gap-4 max-w-md mx-auto mb-10">
          <div className="h-px flex-1 bg-white/10" />
          <span className="text-stone-500 text-[11px] uppercase tracking-widest shrink-0">
            o completá el formulario a tu ritmo
          </span>
          <div className="h-px flex-1 bg-white/10" />
        </div>

        {/* ── SECUNDARIO — formulario multi-step ── */}
        <div className="max-w-md mx-auto">
          <AnimatePresence mode="wait">
            {status === "sent" ? (
              <motion.div
                key="sent"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-white/[0.03] border border-white/10 rounded-2xl p-8 text-center"
              >
                <div className="w-12 h-12 rounded-full bg-[#D4B06A]/15 flex items-center justify-center mx-auto mb-5">
                  <span className="text-[#D4B06A] text-xl">✓</span>
                </div>
                <h3 className="text-white font-bold text-lg mb-2">
                  {sentVia === "llamada" ? "¡Listo, te llamamos!" : "¡Consulta recibida!"}
                </h3>
                {form.email && sentVia === "form" && (
                  <p className="text-stone-400 text-sm mb-1">
                    Te enviamos un email de confirmación a{" "}
                    <span className="text-white font-medium">{form.email}</span>
                  </p>
                )}
                <p className="text-stone-400 text-sm mb-7">
                  {sentVia === "llamada"
                    ? "Un asesor MOVARA se comunica con vos a la brevedad."
                    : "Un asesor MOVARA te contacta a la brevedad."}
                </p>
                <a
                  href={getWhatsAppUrl(waMsgPostForm, waNumber)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-green-600/20 hover:bg-green-600/30 border border-green-500/30 text-green-400 text-xs font-semibold rounded-xl transition-colors"
                >
                  <WhatsAppIcon />
                  ¿Querés hablar ahora? Escribinos por WhatsApp
                </a>
                <div className="mt-6">
                  <button
                    onClick={resetAll}
                    className="text-sm text-stone-500 hover:text-stone-300 underline underline-offset-2 transition-colors"
                  >
                    Hacer otra consulta
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 sm:p-7"
              >
                {/* Qué incluye */}
                <ul className="space-y-2.5 mb-6">
                  {(content?.items?.length ? content.items : DEFAULT_ITEMS).map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-stone-400 text-xs leading-snug">
                      <span className="mt-0.5 w-4 h-4 rounded-full bg-[#D4B06A]/15 flex items-center justify-center text-[#D4B06A] text-[9px] font-bold shrink-0">✓</span>
                      {item}
                    </li>
                  ))}
                </ul>

                {/* Progreso */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-stone-500 text-[11px] font-semibold uppercase tracking-widest">
                      Paso {step} de {TOTAL_STEPS}
                    </span>
                  </div>
                  <div className="flex gap-1.5">
                    {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((i) => (
                      <div key={i} className={`h-1 flex-1 rounded-full transition-colors duration-300 ${i <= step ? "bg-[#D4B06A]" : "bg-white/10"}`} />
                    ))}
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Paso 1 — uso + provincia (sin datos personales) */}
                  {step === 1 && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-stone-400 text-[10px] font-semibold uppercase tracking-widest mb-2">Uso principal</label>
                        <select name="uso" value={form.uso} onChange={set("uso")} className={selectCls}>
                          <option value="">Seleccioná</option>
                          <option value="Vivienda familiar">Vivienda familiar</option>
                          <option value="Inversión turística / Airbnb">Turismo / Airbnb</option>
                          <option value="Oficina / corporativo">Oficina / corporativo</option>
                          <option value="Infraestructura agropecuaria">Agropecuario</option>
                          <option value="Otro">Otro</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-stone-400 text-[10px] font-semibold uppercase tracking-widest mb-2">Provincia *</label>
                        <select name="provincia" value={form.provincia} onChange={set("provincia")} required className={selectCls}>
                          <option value="" disabled>Seleccioná tu provincia</option>
                          {PROVINCIAS.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                        {step1Touched && !form.provincia && (
                          <p className="text-red-400 text-xs mt-1">Seleccioná tu provincia para continuar</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Paso 2 — terreno + presupuesto + cuándo (sigue sin datos de contacto) */}
                  {step === 2 && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-stone-400 text-[10px] font-semibold uppercase tracking-widest mb-2">¿Tenés terreno?</label>
                        <select name="terreno" value={form.terreno} onChange={set("terreno")} className={selectCls}>
                          <option value="">Seleccioná</option>
                          <option value="Sí, tengo terreno propio">Sí, tengo terreno</option>
                          <option value="No, estoy buscando">No, estoy buscando</option>
                          <option value="Tengo acceso (campo o empresa)">Campo / empresa</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-stone-400 text-[10px] font-semibold uppercase tracking-widest mb-2">Presupuesto estimado</label>
                        <select name="presupuesto" value={form.presupuesto} onChange={set("presupuesto")} className={selectCls}>
                          <option value="">Seleccioná</option>
                          <option value="Hasta USD 20.000">Hasta USD 20.000</option>
                          <option value="USD 20.000 – 35.000">USD 20.000 – 35.000</option>
                          <option value="USD 35.000 – 60.000">USD 35.000 – 60.000</option>
                          <option value="Más de USD 60.000">Más de USD 60.000</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-stone-400 text-[10px] font-semibold uppercase tracking-widest mb-2">¿Cuándo instalás?</label>
                        <select name="cuando" value={form.cuando} onChange={set("cuando")} className={selectCls}>
                          <option value="">Seleccioná</option>
                          <option value="Lo antes posible">Lo antes posible</option>
                          <option value="En 3–6 meses">En 3–6 meses</option>
                          <option value="En 6–12 meses">En 6–12 meses</option>
                          <option value="Estoy evaluando opciones">Estoy evaluando</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {/* Paso 3 — recién acá, datos personales */}
                  {step === 3 && (
                    <div className="space-y-4">
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-stone-400 text-[10px] font-semibold uppercase tracking-widest mb-2">Nombre *</label>
                          <input name="nombre" value={form.nombre} onChange={set("nombre")} required maxLength={100} placeholder="Tu nombre" className={plainInputCls} />
                          {quickCallTouched && !form.nombre.trim() && (
                            <p className="text-red-400 text-xs mt-1">Ingresá tu nombre</p>
                          )}
                        </div>
                        <div>
                          <label className="block text-stone-400 text-[10px] font-semibold uppercase tracking-widest mb-2">Apellido *</label>
                          <input name="apellido" value={form.apellido} onChange={set("apellido")} required maxLength={100} placeholder="Tu apellido" className={plainInputCls} />
                        </div>
                      </div>

                      <div className="grid sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-stone-400 text-[10px] font-semibold uppercase tracking-widest mb-2">DNI *</label>
                          <input
                            name="dni"
                            value={form.dni}
                            onChange={set("dni")}
                            onBlur={handleBlur("dni")}
                            required
                            inputMode="numeric"
                            maxLength={8}
                            placeholder="12345678"
                            className={inputCls(errors, "dni")}
                          />
                          {errors.dni && <p className="text-red-400 text-xs mt-1">{errors.dni}</p>}
                        </div>
                        <div>
                          <label className="block text-stone-400 text-[10px] font-semibold uppercase tracking-widest mb-2">Teléfono *</label>
                          <input
                            name="telefono"
                            value={form.telefono}
                            onChange={set("telefono")}
                            onBlur={handleBlur("telefono")}
                            required
                            maxLength={30}
                            placeholder="+54 9 11..."
                            className={inputCls(errors, "telefono")}
                          />
                          {errors.telefono && <p className="text-red-400 text-xs mt-1">{errors.telefono}</p>}
                        </div>
                      </div>

                      <div>
                        <label className="block text-stone-400 text-[10px] font-semibold uppercase tracking-widest mb-2">Email *</label>
                        <input
                          name="email"
                          type="email"
                          value={form.email}
                          onChange={set("email")}
                          onBlur={handleBlur("email")}
                          required
                          placeholder="tu@email.com"
                          className={inputCls(errors, "email")}
                        />
                        {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email}</p>}
                      </div>

                      <div>
                        <label className="block text-stone-400 text-[10px] font-semibold uppercase tracking-widest mb-2">
                          ¿Querés contarnos algo más sobre tu proyecto? (opcional)
                        </label>
                        <textarea
                          name="consulta"
                          value={form.consulta}
                          onChange={set("consulta")}
                          maxLength={500}
                          rows={3}
                          placeholder="Contanos dónde tenés el terreno, para qué lo necesitás, si tenés alguna consulta específica..."
                          className={`${plainInputCls} resize-none`}
                        />
                        <p className="text-stone-600 text-[11px] text-right mt-1">
                          {form.consulta.length} / 500
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Navegación */}
                  <div className="flex items-center gap-3 pt-1">
                    {step > 1 && (
                      <button
                        type="button"
                        onClick={goBack}
                        disabled={status === "sending"}
                        className="inline-flex items-center gap-1.5 px-4 py-3.5 text-stone-400 hover:text-white text-sm font-medium transition-colors disabled:opacity-50"
                      >
                        <ArrowLeft size={15} />
                        Atrás
                      </button>
                    )}

                    {step < TOTAL_STEPS ? (
                      <button
                        type="button"
                        onClick={goNext}
                        className="flex-1 inline-flex items-center justify-center gap-2 py-3.5 bg-white/10 hover:bg-white/15 text-white font-semibold rounded-xl transition-colors text-sm"
                      >
                        Continuar
                        <ArrowRight size={15} />
                      </button>
                    ) : (
                      <button
                        type="submit"
                        disabled={status === "sending"}
                        className="flex-1 py-3.5 bg-white/10 hover:bg-white/15 disabled:opacity-60 text-white font-semibold rounded-xl transition-colors text-sm"
                      >
                        {status === "sending" ? "Enviando…" : (content?.textoCTA ?? "Quiero mi precio de lanzamiento")}
                      </button>
                    )}
                  </div>

                  {/* Alternativa del paso 3: no perder al lead que no quiere seguir tipeando */}
                  {step === 3 && (
                    <div className="text-center pt-1">
                      <button
                        type="button"
                        onClick={handleQuickCall}
                        disabled={status === "sending"}
                        className="text-stone-500 hover:text-[#D4B06A] text-xs underline underline-offset-2 transition-colors disabled:opacity-50"
                      >
                        Prefiero que me llamen, sin completar el resto
                      </button>
                    </div>
                  )}
                  <AvisoPrivacidad tono="oscuro" className="text-center" />
                </form>

                <div className="pt-6 mt-6 border-t border-white/10">
                  <TrustRow />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
