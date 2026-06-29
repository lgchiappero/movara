"use client";

import { useState } from "react";
import { getWhatsAppUrl } from "@/lib/whatsapp";

const PROVINCIAS = [
  "Buenos Aires", "Ciudad Autónoma de Buenos Aires", "Catamarca", "Chaco",
  "Chubut", "Córdoba", "Corrientes", "Entre Ríos", "Formosa", "Jujuy",
  "La Pampa", "La Rioja", "Mendoza", "Misiones", "Neuquén", "Río Negro",
  "Salta", "San Juan", "San Luis", "Santa Cruz", "Santa Fe",
  "Santiago del Estero", "Tierra del Fuego", "Tucumán",
];

type FormState = {
  nombre: string;
  telefono: string;
  email: string;
  provincia: string;
  mensaje: string;
};

const EMPTY: FormState = { nombre: "", telefono: "", email: "", provincia: "", mensaje: "" };

type ContactoContent = {
  titulo?: string;
  subtitulo?: string;
  textoCTA?: string;
};

export default function ContactoForm({
  waNumber,
  content,
}: {
  waNumber?: string | null;
  content?: ContactoContent | null;
}) {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nombre.trim() || !form.telefono.trim()) return;
    setStatus("sending");
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        localStorage.setItem("movara_exit_popup_submitted", "true");
        window.dispatchEvent(new Event("movara:form:submitted"));
        setStatus("sent");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  };

  const waMsg = `Hola MOVARA! Quiero más información sobre sus espacios modulares.${form.provincia ? ` Soy de ${form.provincia}.` : ""}`;
  const waUrl = getWhatsAppUrl(waMsg, waNumber);

  const inputCls =
    "w-full px-4 py-3 rounded-xl bg-stone-800 border border-stone-700 text-white placeholder:text-stone-500 text-sm focus:outline-none focus:border-sage-400 focus:ring-2 focus:ring-sage-400/20 transition-colors";

  return (
    <section id="contacto" className="py-24 bg-[#2F2F2F]">
      <div className="max-w-5xl mx-auto px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-start">
          {/* Copy */}
          <div>
            <span className="text-xs font-semibold uppercase tracking-widest text-[#D4B06A] mb-3 block">
              Asesoramiento privado
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-white leading-tight mb-4">
              {content?.titulo ?? "Hablá con un asesor MOVARA."}
            </h2>
            <p className="text-stone-300 text-lg font-medium leading-relaxed mb-8">
              {content?.subtitulo ?? "Respondemos a la brevedad. Sin presión, con toda la información."}
            </p>

            <div className="space-y-4">
              {[
                { icon: "⏰", text: "Respondemos a la brevedad" },
                { icon: "💰", text: "Presupuesto sin compromiso, precio fijo" },
                { icon: "🔒", text: "Tus datos son privados, no los compartimos" },
              ].map(({ icon, text }) => (
                <div key={text} className="flex items-center gap-3">
                  <span className="text-xl">{icon}</span>
                  <p className="text-stone-200 text-base font-medium">{text}</p>
                </div>
              ))}
            </div>

            <div className="mt-10 pt-8 border-t border-stone-700">
              <p className="text-stone-500 text-sm mb-4">¿Preferís escribirnos directo?</p>
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2.5 px-6 py-3.5 bg-green-600 hover:bg-green-500 text-white font-semibold rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-green-500/20 text-sm"
              >
                <WhatsAppIcon className="w-5 h-5" />
                Abrir WhatsApp
              </a>
            </div>
          </div>

          {/* Form */}
          <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6 sm:p-8">
            {status === "sent" ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="w-14 h-14 rounded-full bg-sage-500/20 flex items-center justify-center mb-4 text-3xl">
                  ✅
                </div>
                <h3 className="text-white font-bold text-xl mb-2">¡Mensaje recibido!</h3>
                <p className="text-stone-400 text-sm max-w-xs">
                  Te contactamos a la brevedad. También podés escribirnos por WhatsApp.
                </p>
                <button
                  onClick={() => { setForm(EMPTY); setStatus("idle"); }}
                  className="mt-6 text-sm text-sage-400 hover:text-sage-300 underline underline-offset-2 transition-colors"
                >
                  Enviar otra consulta
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-stone-400 text-xs font-semibold uppercase tracking-wider block mb-1.5">
                      Nombre *
                    </label>
                    <input
                      type="text"
                      value={form.nombre}
                      onChange={set("nombre")}
                      placeholder="Tu nombre"
                      maxLength={100}
                      required
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="text-stone-400 text-xs font-semibold uppercase tracking-wider block mb-1.5">
                      Teléfono *
                    </label>
                    <input
                      type="tel"
                      value={form.telefono}
                      onChange={set("telefono")}
                      placeholder="+54 9 11..."
                      maxLength={30}
                      required
                      className={inputCls}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-stone-400 text-xs font-semibold uppercase tracking-wider block mb-1.5">
                    Email
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={set("email")}
                    placeholder="tu@email.com"
                    maxLength={150}
                    className={inputCls}
                  />
                </div>

                <div>
                  <label className="text-stone-400 text-xs font-semibold uppercase tracking-wider block mb-1.5">
                    Provincia
                  </label>
                  <select
                    value={form.provincia}
                    onChange={set("provincia")}
                    className={inputCls}
                  >
                    <option value="">Seleccioná una provincia</option>
                    {PROVINCIAS.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-stone-400 text-xs font-semibold uppercase tracking-wider block mb-1.5">
                    Mensaje (opcional)
                  </label>
                  <textarea
                    rows={3}
                    value={form.mensaje}
                    onChange={set("mensaje")}
                    placeholder="¿Qué tipo de espacio necesitás? ¿Tenés terreno?"
                    maxLength={1000}
                    className={`${inputCls} resize-none`}
                  />
                </div>

                {status === "error" && (
                  <p className="text-red-400 text-sm">
                    Hubo un error. Intentá de nuevo o escribinos por WhatsApp.
                  </p>
                )}

                <button
                  type="submit"
                  disabled={status === "sending"}
                  className="w-full py-3.5 bg-[#D4B06A] hover:bg-[#BF9A52] disabled:opacity-50 disabled:cursor-not-allowed text-[#1A1A1A] font-bold rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-[#D4B06A]/25 text-sm tracking-wide"
                >
                  {status === "sending" ? "Enviando…" : (content?.textoCTA ?? "Solicitar asesoramiento privado")}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}
