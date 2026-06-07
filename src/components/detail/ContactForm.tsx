"use client";

import { useState } from "react";

type FormState = {
  nombre: string;
  email: string;
  telefono: string;
  origen: string;
  mensaje: string;
};

const ORIGENOPTIONS = [
  "Instagram",
  "Google",
  "Recomendación de un amigo",
  "Feria / exposición",
  "Otra red social",
  "Otro",
];

export default function ContactForm({ modelName }: { modelName: string }) {
  const [form, setForm] = useState<FormState>({
    nombre: "",
    email: "",
    telefono: "",
    origen: "",
    mensaje: `Hola, me interesa el modelo ${modelName}. ¿Podrían enviarme más información y un presupuesto?`,
  });
  const [errors, setErrors] = useState<Partial<FormState>>({});
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const validate = (): boolean => {
    const e: Partial<FormState> = {};
    if (!form.nombre.trim()) e.nombre = "Ingresá tu nombre";
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      e.email = "Email inválido";
    if (!form.mensaje.trim()) e.mensaje = "Escribí tu consulta";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    await new Promise((r) => setTimeout(r, 900));
    setLoading(false);
    setSent(true);
  };

  const set = (field: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }));

  if (sent) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-5">
          <CheckIcon className="w-8 h-8 text-green-600" />
        </div>
        <h3 className="text-xl font-bold text-stone-900">¡Consulta enviada!</h3>
        <p className="mt-2 text-stone-500 max-w-xs">
          Te respondemos en menos de 24 horas. Revisá tu bandeja de entrada.
        </p>
        <button
          onClick={() => { setSent(false); }}
          className="mt-6 text-sm text-amber-600 font-semibold hover:underline"
        >
          Enviar otra consulta
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      {/* Row: nombre + email */}
      <div className="grid sm:grid-cols-2 gap-5">
        <Field
          label="Nombre y apellido"
          required
          error={errors.nombre}
        >
          <input
            type="text"
            value={form.nombre}
            onChange={set("nombre")}
            maxLength={100}
            placeholder="Juan García"
            className={inputClass(!!errors.nombre)}
          />
        </Field>
        <Field label="Email" required error={errors.email}>
          <input
            type="email"
            value={form.email}
            onChange={set("email")}
            maxLength={254}
            placeholder="juan@email.com"
            className={inputClass(!!errors.email)}
          />
        </Field>
      </div>

      {/* Row: teléfono + origen */}
      <div className="grid sm:grid-cols-2 gap-5">
        <Field label="Teléfono">
          <input
            type="tel"
            value={form.telefono}
            onChange={set("telefono")}
            maxLength={30}
            placeholder="+54 9 11 0000-0000"
            className={inputClass(false)}
          />
        </Field>
        <Field label="¿Cómo nos conociste?">
          <select
            value={form.origen}
            onChange={set("origen")}
            className={inputClass(false)}
          >
            <option value="">Seleccioná una opción</option>
            {ORIGENOPTIONS.map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        </Field>
      </div>

      {/* Mensaje */}
      <Field label="Tu consulta" required error={errors.mensaje}>
        <textarea
          rows={4}
          value={form.mensaje}
          onChange={set("mensaje")}
          maxLength={2000}
          className={`${inputClass(!!errors.mensaje)} resize-none`}
        />
      </Field>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white font-bold rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-amber-600/20 flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <SpinnerIcon className="w-4 h-4 animate-spin" />
            Enviando…
          </>
        ) : (
          "Solicitar presupuesto"
        )}
      </button>

      <p className="text-center text-xs text-stone-400">
        Sin compromisos · Respondemos en menos de 24 hs
      </p>
    </form>
  );
}

// ──────────────────────────────────────────────────────────────
// Sub-components
// ──────────────────────────────────────────────────────────────
function Field({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-stone-700">
        {label}
        {required && <span className="text-amber-600 ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

const inputClass = (hasError: boolean) =>
  `w-full px-4 py-2.5 rounded-xl border text-stone-900 bg-white text-sm placeholder:text-stone-400 outline-none transition-colors focus:ring-2 focus:ring-amber-500/30 focus:border-amber-400 ${
    hasError
      ? "border-red-300 focus:border-red-400 focus:ring-red-200"
      : "border-stone-200 hover:border-stone-300"
  }`;

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function SpinnerIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}
