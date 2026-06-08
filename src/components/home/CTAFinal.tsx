"use client";

import { useState } from "react";

type CtaData = {
  title?: string | null;
  subtitle?: string | null;
  ctaText?: string | null;
};

export default function CTAFinal({
  waNumber,
  data,
}: {
  waNumber?: string | null;
  data?: CtaData | null;
}) {
  const number = waNumber || process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "5491100000000";
  const ctaTitle = data?.title ?? "¿Listo para dar el primer paso?";
  const ctaSubtitle =
    data?.subtitle ??
    "Sin compromisos. En una primera charla entendemos tu proyecto, te orientamos en modelos y te damos una idea de costos sin vueltas.";
  const ctaButtonText = data?.ctaText ?? "Consultar por WhatsApp";
  const [form, setForm] = useState({ nombre: "", telefono: "", mensaje: "" });
  const [sent, setSent] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = encodeURIComponent(
      `Hola, me contacto desde la web de Habitatt.\n\n` +
        `*Nombre:* ${form.nombre}\n` +
        `*Teléfono:* ${form.telefono}\n` +
        `*Consulta:* ${form.mensaje}`
    );
    window.open(`https://wa.me/${number}?text=${text}`, "_blank", "noopener,noreferrer");
    setSent(true);
  }

  const waHref = `https://wa.me/${number}?text=${encodeURIComponent("Hola, quiero conocer más sobre las casas modulares de Habitatt.")}`;

  return (
    <section id="contacto" className="bg-white py-24">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-14 items-center">
          {/* Left — CTA copy */}
          <div>
            <span className="text-sage-600 text-sm font-semibold uppercase tracking-widest">
              Empezá hoy
            </span>
            <h2 className="mt-3 text-4xl lg:text-5xl font-bold text-stone-900 tracking-tight leading-[1.1]">
              {ctaTitle}
            </h2>
            <p className="mt-5 text-lg text-stone-500 leading-relaxed max-w-md">
              {ctaSubtitle}
            </p>

            <a
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-8 inline-flex items-center gap-3 bg-[#25D366] hover:bg-[#1fba58] text-white font-bold px-8 py-4 rounded-xl transition-all duration-200 hover:shadow-xl hover:shadow-green-500/25 hover:-translate-y-0.5 text-base"
            >
              <WhatsAppIcon />
              {ctaButtonText}
            </a>

            <div className="mt-6 flex items-center gap-2 text-stone-400 text-sm">
              <ClockIcon />
              Respondemos en menos de 2 horas en horario comercial
            </div>

            <div className="mt-10 pt-8 border-t border-stone-100 grid grid-cols-3 gap-6">
              {[
                { value: "+50", label: "Casas entregadas" },
                { value: "8+", label: "Años de experiencia" },
                { value: "100%", label: "Fabricación argentina" },
              ].map(({ value, label }) => (
                <div key={label}>
                  <p className="text-2xl font-bold text-stone-900">{value}</p>
                  <p className="text-stone-400 text-xs mt-0.5 leading-snug">{label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right — Quick contact form */}
          <div className="bg-sage-50 border border-sage-100 rounded-2xl p-8">
            {sent ? (
              <div className="flex flex-col items-center text-center py-8">
                <div className="w-16 h-16 bg-sage-100 rounded-full flex items-center justify-center mb-5">
                  <CheckIcon className="w-8 h-8 text-sage-600" />
                </div>
                <h3 className="text-xl font-bold text-stone-900 mb-2">¡Mensaje enviado!</h3>
                <p className="text-stone-500 text-sm">
                  Se abrió WhatsApp con tu consulta. Te respondemos a la brevedad.
                </p>
                <button
                  onClick={() => setSent(false)}
                  className="mt-6 text-sage-600 text-sm font-semibold hover:underline"
                >
                  Enviar otra consulta
                </button>
              </div>
            ) : (
              <>
                <h3 className="text-xl font-bold text-stone-900 mb-1">Envianos tu consulta</h3>
                <p className="text-stone-500 text-sm mb-6">
                  Completá el formulario y te contactamos por WhatsApp al instante.
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="nombre" className="block text-sm font-medium text-stone-700 mb-1.5">
                      Nombre
                    </label>
                    <input
                      id="nombre"
                      name="nombre"
                      type="text"
                      required
                      maxLength={100}
                      placeholder="Tu nombre"
                      value={form.nombre}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-white border border-stone-200 rounded-xl text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-sage-500/30 focus:border-sage-400 transition-colors"
                    />
                  </div>

                  <div>
                    <label htmlFor="telefono" className="block text-sm font-medium text-stone-700 mb-1.5">
                      Teléfono / WhatsApp
                    </label>
                    <input
                      id="telefono"
                      name="telefono"
                      type="tel"
                      required
                      maxLength={30}
                      placeholder="+54 9 11 0000-0000"
                      value={form.telefono}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-white border border-stone-200 rounded-xl text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-sage-500/30 focus:border-sage-400 transition-colors"
                    />
                  </div>

                  <div>
                    <label htmlFor="mensaje" className="block text-sm font-medium text-stone-700 mb-1.5">
                      ¿Qué tenés en mente?
                    </label>
                    <textarea
                      id="mensaje"
                      name="mensaje"
                      rows={3}
                      required
                      maxLength={1000}
                      placeholder="Ej: Busco una vivienda de 2 habitaciones para mi terreno en Córdoba..."
                      value={form.mensaje}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-white border border-stone-200 rounded-xl text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-sage-500/30 focus:border-sage-400 transition-colors resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full flex items-center justify-center gap-2 bg-sage-600 hover:bg-sage-500 text-white font-semibold py-3.5 rounded-xl transition-colors duration-200 text-sm"
                  >
                    <WhatsAppIcon />
                    Enviar por WhatsApp
                  </button>

                  <p className="text-center text-stone-400 text-xs">
                    Al enviar, se abrirá WhatsApp con tu mensaje pre-cargado.
                  </p>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function WhatsAppIcon() {
  return (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}
