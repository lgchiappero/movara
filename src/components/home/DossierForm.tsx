"use client";

import { useState } from "react";
import { motion } from "framer-motion";

const PROVINCIAS = [
  "Buenos Aires", "Ciudad Autónoma de Buenos Aires", "Catamarca", "Chaco",
  "Chubut", "Córdoba", "Corrientes", "Entre Ríos", "Formosa", "Jujuy",
  "La Pampa", "La Rioja", "Mendoza", "Misiones", "Neuquén", "Río Negro",
  "Salta", "San Juan", "San Luis", "Santa Cruz", "Santa Fe",
  "Santiago del Estero", "Tierra del Fuego", "Tucumán",
];

type Form = {
  nombre: string;
  telefono: string;
  email: string;
  provincia: string;
  terreno: string;
  uso: string;
  presupuesto: string;
  cuando: string;
};

const EMPTY: Form = {
  nombre: "", telefono: "", email: "", provincia: "",
  terreno: "", uso: "", presupuesto: "", cuando: "",
};

const selectCls =
  "w-full bg-[#2F2F2F] border border-white/10 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#D4B06A]/50 transition-colors appearance-none";

const inputCls =
  "w-full bg-white/5 border border-white/10 text-white placeholder-stone-600 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#D4B06A]/50 transition-colors";

export default function DossierForm({ waNumber: _ }: { waNumber?: string | null }) {
  const [form, setForm] = useState<Form>(EMPTY);
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  const set =
    (k: keyof Form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("sending");
    try {
      const mensaje = [
        form.terreno && `Terreno: ${form.terreno}`,
        form.uso && `Uso: ${form.uso}`,
        form.presupuesto && `Presupuesto: ${form.presupuesto}`,
        form.cuando && `Instalación: ${form.cuando}`,
        "Origen: Dossier privado",
      ]
        .filter(Boolean)
        .join(" | ");

      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: form.nombre,
          telefono: form.telefono,
          email: form.email || undefined,
          provincia: form.provincia || undefined,
          mensaje,
        }),
      });
      setStatus(res.ok ? "sent" : "error");
    } catch {
      setStatus("error");
    }
  };

  return (
    <section id="dossier" className="py-32 bg-[#2F2F2F]">
      <div className="max-w-5xl mx-auto px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-start">
          {/* Left — dossier info */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            <span className="text-[#D4B06A] text-xs font-semibold uppercase tracking-widest mb-6 block">
              Dossier privado
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-white leading-tight mb-6">
              Accedé al dossier exclusivo MOVARA.
            </h2>
            <p className="text-stone-400 text-base leading-relaxed mb-10">
              Solo para clientes seleccionados. Completá el formulario y un asesor MOVARA
              se comunica con vos en menos de 2 horas hábiles.
            </p>

            <ul className="space-y-5 mb-12">
              {[
                "Modelos completos con planos y especificaciones técnicas",
                "Configuraciones premium y opciones de personalización",
                "Comparativa técnica vs. construcción tradicional",
                "Escenarios de inversión Airbnb con proyección de ROI",
                "Condiciones exclusivas de preventa y lanzamiento",
                "Acceso a asesoramiento privado con nuestro equipo",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-stone-300 text-sm">
                  <span className="mt-0.5 w-5 h-5 rounded-full bg-[#D4B06A]/20 flex items-center justify-center text-[#D4B06A] text-[10px] font-bold shrink-0">
                    ✓
                  </span>
                  {item}
                </li>
              ))}
            </ul>

            <div className="pt-8 border-t border-white/10">
              <p className="text-stone-600 text-xs leading-relaxed">
                Tu información es confidencial. No compartimos datos con terceros.
                Solo te contactamos con información MOVARA relevante a tu consulta.
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
            {status === "sent" ? (
              <div className="bg-white/5 border border-[#D4B06A]/30 rounded-2xl p-10 text-center">
                <div className="w-14 h-14 rounded-full bg-[#D4B06A]/20 flex items-center justify-center mx-auto mb-6">
                  <span className="text-[#D4B06A] text-2xl">✓</span>
                </div>
                <h3 className="text-white font-bold text-xl mb-3">¡Solicitud recibida!</h3>
                <p className="text-stone-400 text-sm leading-relaxed max-w-xs mx-auto">
                  Un asesor MOVARA se va a comunicar con vos en menos de 2 horas hábiles
                  con el dossier completo y los detalles de preventa.
                </p>
              </div>
            ) : (
              <form
                onSubmit={handleSubmit}
                className="bg-white/5 border border-white/10 rounded-2xl p-7 lg:p-8 space-y-4"
              >
                {/* Nombre + Teléfono */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-stone-400 text-[10px] font-semibold uppercase tracking-widest mb-2">
                      Nombre *
                    </label>
                    <input
                      name="nombre"
                      value={form.nombre}
                      onChange={set("nombre")}
                      required
                      maxLength={100}
                      placeholder="Tu nombre"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="block text-stone-400 text-[10px] font-semibold uppercase tracking-widest mb-2">
                      Teléfono *
                    </label>
                    <input
                      name="telefono"
                      value={form.telefono}
                      onChange={set("telefono")}
                      required
                      maxLength={30}
                      placeholder="+54 9 11..."
                      className={inputCls}
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-stone-400 text-[10px] font-semibold uppercase tracking-widest mb-2">
                    Email *
                  </label>
                  <input
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={set("email")}
                    required
                    placeholder="tu@email.com"
                    className={inputCls}
                  />
                </div>

                {/* Provincia */}
                <div>
                  <label className="block text-stone-400 text-[10px] font-semibold uppercase tracking-widest mb-2">
                    Provincia *
                  </label>
                  <select
                    name="provincia"
                    value={form.provincia}
                    onChange={set("provincia")}
                    required
                    className={selectCls}
                  >
                    <option value="" disabled>Seleccioná tu provincia</option>
                    {PROVINCIAS.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>

                {/* Terreno + Uso */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-stone-400 text-[10px] font-semibold uppercase tracking-widest mb-2">
                      ¿Tenés terreno?
                    </label>
                    <select name="terreno" value={form.terreno} onChange={set("terreno")} className={selectCls}>
                      <option value="">Seleccioná</option>
                      <option value="Sí, tengo terreno propio">Sí, tengo terreno</option>
                      <option value="No, estoy buscando">No, estoy buscando</option>
                      <option value="Tengo acceso (campo o empresa)">Tengo acceso (campo / empresa)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-stone-400 text-[10px] font-semibold uppercase tracking-widest mb-2">
                      Uso principal
                    </label>
                    <select name="uso" value={form.uso} onChange={set("uso")} className={selectCls}>
                      <option value="">Seleccioná</option>
                      <option value="Vivienda familiar">Vivienda familiar</option>
                      <option value="Inversión turística / Airbnb">Inversión turística / Airbnb</option>
                      <option value="Oficina / corporativo">Oficina / corporativo</option>
                      <option value="Infraestructura agropecuaria">Infraestructura agropecuaria</option>
                      <option value="Otro">Otro</option>
                    </select>
                  </div>
                </div>

                {/* Presupuesto + Cuándo */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-stone-400 text-[10px] font-semibold uppercase tracking-widest mb-2">
                      Presupuesto estimado
                    </label>
                    <select name="presupuesto" value={form.presupuesto} onChange={set("presupuesto")} className={selectCls}>
                      <option value="">Seleccioná</option>
                      <option value="Hasta USD 20.000">Hasta USD 20.000</option>
                      <option value="USD 20.000 – 35.000">USD 20.000 – 35.000</option>
                      <option value="USD 35.000 – 60.000">USD 35.000 – 60.000</option>
                      <option value="Más de USD 60.000">Más de USD 60.000</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-stone-400 text-[10px] font-semibold uppercase tracking-widest mb-2">
                      ¿Cuándo instalás?
                    </label>
                    <select name="cuando" value={form.cuando} onChange={set("cuando")} className={selectCls}>
                      <option value="">Seleccioná</option>
                      <option value="Lo antes posible">Lo antes posible</option>
                      <option value="En 3–6 meses">En 3–6 meses</option>
                      <option value="En 6–12 meses">En 6–12 meses</option>
                      <option value="Estoy evaluando opciones">Estoy evaluando</option>
                    </select>
                  </div>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={status === "sending"}
                  className="w-full py-4 bg-[#D4B06A] hover:bg-[#BF9A52] disabled:opacity-60 text-[#1A1A1A] font-bold rounded-xl transition-all duration-200 hover:shadow-xl hover:shadow-[#D4B06A]/20 hover:-translate-y-0.5 text-sm tracking-wide"
                >
                  {status === "sending" ? "Enviando…" : "Quiero el dossier privado"}
                </button>

                {status === "error" && (
                  <p className="text-red-400 text-xs text-center">
                    Hubo un error. Por favor intentá de nuevo.
                  </p>
                )}

                <p className="text-stone-600 text-xs text-center leading-relaxed">
                  Respuesta en menos de 2 horas hábiles · Información 100% confidencial
                </p>
              </form>
            )}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
