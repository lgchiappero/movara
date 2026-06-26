"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { getWhatsAppUrl } from "@/lib/whatsapp";

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

function WhatsAppIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all required fields
    const emailErr = validateEmail(form.email);
    const telErr = validateTelefono(form.telefono);
    const dniErr = validateDNI(form.dni);
    setErrors({ email: emailErr, telefono: telErr, dni: dniErr });
    if (emailErr || telErr || dniErr) return;

    setStatus("sending");

    const mensajeParts = [
      form.terreno && `Terreno: ${form.terreno}`,
      form.uso && `Uso: ${form.uso}`,
      form.presupuesto && `Presupuesto: ${form.presupuesto}`,
      form.cuando && `Instalación: ${form.cuando}`,
      form.consulta && `Consulta: ${form.consulta}`,
      "Origen: Carpeta de proyecto",
    ].filter(Boolean);

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
          mensaje: mensajeParts.join(" | "),
        }),
      });
    } catch (err) {
      console.error("[DossierForm] submit error:", err);
    }

    setStatus("sent");
  };

  const waMsg = `Hola MOVARA! 👋 Mi nombre es ${[form.nombre, form.apellido].filter(Boolean).join(" ")}. Completé el formulario en el sitio y me interesa recibir información sobre precio de lanzamiento.${form.email ? ` Mi email es ${form.email}` : ""}${form.telefono ? ` y mi teléfono es ${form.telefono}` : ""}.`;

  return (
    <section id="dossier" className="py-32 bg-[#2F2F2F]">
      <div className="max-w-5xl mx-auto px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-start">

          {/* Left — info */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            <span className="text-[#D4B06A] text-xs font-semibold uppercase tracking-widest mb-6 block">
              Carpeta de proyecto
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-white leading-tight mb-6">
              {content?.titulo ?? "Accedé a la información completa MOVARA."}
            </h2>
            <p className="text-stone-400 text-base leading-relaxed mb-10">
              {content?.subtitulo ??
                "Completá el formulario y un asesor MOVARA te contacta a la brevedad."}
            </p>
            <ul className="space-y-5 mb-12">
              {(content?.items?.length ? content.items : DEFAULT_ITEMS).map((item) => (
                <li key={item} className="flex items-start gap-3 text-stone-300 text-sm">
                  <span className="mt-0.5 w-5 h-5 rounded-full bg-[#D4B06A]/20 flex items-center justify-center text-[#D4B06A] text-[10px] font-bold shrink-0">✓</span>
                  {item}
                </li>
              ))}
            </ul>
            <div className="pt-8 border-t border-white/10">
              <p className="text-stone-600 text-xs leading-relaxed">
                Tu información es confidencial. No compartimos datos con terceros.
              </p>
            </div>
          </motion.div>

          {/* Right — form */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            {/* ── SUCCESS ── */}
            {status === "sent" && (
              <div className="bg-white/5 border border-[#D4B06A]/30 rounded-2xl p-10 text-center">
                <div className="w-14 h-14 rounded-full bg-[#D4B06A]/20 flex items-center justify-center mx-auto mb-6">
                  <span className="text-[#D4B06A] text-2xl">✓</span>
                </div>
                <h3 className="text-white font-bold text-xl mb-2">¡Consulta recibida!</h3>
                {form.email && (
                  <p className="text-stone-400 text-sm mb-1">
                    Te enviamos un email de confirmación a{" "}
                    <span className="text-white font-medium">{form.email}</span>
                  </p>
                )}
                <p className="text-stone-400 text-sm mb-8">Un asesor MOVARA te contacta a la brevedad.</p>
                <a
                  href={getWhatsAppUrl(waMsg, waNumber)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-green-600/20 hover:bg-green-600/30 border border-green-500/30 text-green-400 text-xs font-semibold rounded-xl transition-colors"
                >
                  <WhatsAppIcon />
                  ¿Querés hablar ahora? Escribinos por WhatsApp
                </a>
                <div className="mt-6">
                  <button
                    onClick={() => { setForm(EMPTY); setErrors({}); setStatus("idle"); }}
                    className="text-sm text-stone-500 hover:text-stone-300 underline underline-offset-2 transition-colors"
                  >
                    Hacer otra consulta
                  </button>
                </div>
              </div>
            )}

            {/* ── FORM ── */}
            {(status === "idle" || status === "sending") && (
              <form
                onSubmit={handleSubmit}
                className="bg-white/5 border border-white/10 rounded-2xl p-7 lg:p-8 space-y-4"
              >
                {/* Nombre + Apellido */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-stone-400 text-[10px] font-semibold uppercase tracking-widest mb-2">Nombre *</label>
                    <input name="nombre" value={form.nombre} onChange={set("nombre")} required maxLength={100} placeholder="Tu nombre" className={plainInputCls} />
                  </div>
                  <div>
                    <label className="block text-stone-400 text-[10px] font-semibold uppercase tracking-widest mb-2">Apellido *</label>
                    <input name="apellido" value={form.apellido} onChange={set("apellido")} required maxLength={100} placeholder="Tu apellido" className={plainInputCls} />
                  </div>
                </div>

                {/* DNI + Teléfono */}
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

                {/* Email */}
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

                {/* Provincia */}
                <div>
                  <label className="block text-stone-400 text-[10px] font-semibold uppercase tracking-widest mb-2">Provincia *</label>
                  <select name="provincia" value={form.provincia} onChange={set("provincia")} required className={selectCls}>
                    <option value="" disabled>Seleccioná tu provincia</option>
                    {PROVINCIAS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>

                {/* Terreno + Uso */}
                <div className="grid sm:grid-cols-2 gap-4">
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
                </div>

                {/* Presupuesto + Cuándo */}
                <div className="grid sm:grid-cols-2 gap-4">
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

                {/* Consulta adicional */}
                <div>
                  <label className="block text-stone-400 text-[10px] font-semibold uppercase tracking-widest mb-2">
                    ¿Querés contarnos algo más sobre tu proyecto?
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

                {/* Submit */}
                <button
                  type="submit"
                  disabled={status === "sending"}
                  className="w-full py-4 bg-[#D4B06A] hover:bg-[#BF9A52] disabled:opacity-60 text-[#1A1A1A] font-bold rounded-xl transition-all duration-200 hover:shadow-xl hover:shadow-[#D4B06A]/20 hover:-translate-y-0.5 text-sm tracking-wide"
                >
                  {status === "sending" ? "Enviando…" : (content?.textoCTA ?? "Quiero mi precio de lanzamiento")}
                </button>

                <p className="text-stone-600 text-xs text-center leading-relaxed">
                  Respuesta a la brevedad · Información 100% confidencial
                </p>
              </form>
            )}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
