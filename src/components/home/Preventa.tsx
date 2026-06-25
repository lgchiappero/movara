"use client";

import { motion } from "framer-motion";

const TOTAL = 20;
const RESERVADAS = 7;

export default function Preventa() {
  const pct = Math.round((RESERVADAS / TOTAL) * 100);

  return (
    <section id="preventa" className="py-32 bg-[#1A1A1A]">
      <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          {/* Badge */}
          <span className="inline-flex items-center gap-2 text-[#D4B06A] text-xs font-semibold uppercase tracking-widest mb-10">
            <span className="w-1.5 h-1.5 rounded-full bg-[#D4B06A] animate-pulse" />
            Preventa activa
          </span>

          <h2 className="text-4xl sm:text-5xl font-bold text-white leading-tight mb-6">
            Primeras {TOTAL} unidades<br />
            en condiciones de lanzamiento.
          </h2>

          <p className="text-stone-400 text-lg max-w-xl mx-auto mb-14 leading-relaxed">
            Las condiciones de preventa no estarán disponibles para siempre.
            Una vez agotadas, el precio y los tiempos de entrega serán los del mercado abierto.
          </p>

          {/* Progress */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-8 mb-10 text-left max-w-md mx-auto">
            <div className="flex justify-between items-baseline mb-3">
              <span className="text-stone-400 text-sm">{RESERVADAS} lugares reservados</span>
              <span className="text-[#D4B06A] font-bold text-lg">{TOTAL - RESERVADAS} disponibles</span>
            </div>
            <div className="h-2.5 bg-white/10 rounded-full overflow-hidden mb-3">
              <motion.div
                initial={{ width: 0 }}
                whileInView={{ width: `${pct}%` }}
                viewport={{ once: true }}
                transition={{ duration: 1.4, delay: 0.2, ease: "easeOut" }}
                className="h-full bg-[#D4B06A] rounded-full"
              />
            </div>
            <p className="text-stone-600 text-xs text-center">
              {RESERVADAS} de {TOTAL} lugares con condiciones especiales ocupados
            </p>
          </div>

          {/* Benefits */}
          <div className="grid sm:grid-cols-3 gap-4 mb-14 text-left">
            {[
              {
                titulo: "Precio de lanzamiento",
                desc: "Bloqueás el precio actual antes de cualquier ajuste de mercado.",
              },
              {
                titulo: "Prioridad de producción",
                desc: "Tu unidad entra primero en la línea de fabricación.",
              },
              {
                titulo: "Asesoramiento privado",
                desc: "Acceso a equipo técnico dedicado y dossier completo exclusivo.",
              },
            ].map((b) => (
              <div key={b.titulo} className="bg-white/5 rounded-xl p-6 border border-white/10 text-left">
                <div className="w-6 h-6 rounded-full bg-[#D4B06A]/20 flex items-center justify-center mb-4">
                  <span className="text-[#D4B06A] text-xs font-bold">✓</span>
                </div>
                <p className="text-white text-sm font-semibold mb-1.5">{b.titulo}</p>
                <p className="text-stone-500 text-xs leading-relaxed">{b.desc}</p>
              </div>
            ))}
          </div>

          <a
            href="#dossier"
            className="inline-flex items-center gap-2 px-9 py-4 bg-[#D4B06A] hover:bg-[#BF9A52] text-[#1A1A1A] font-bold rounded-xl transition-all duration-200 hover:shadow-2xl hover:shadow-[#D4B06A]/20 hover:-translate-y-0.5 text-sm tracking-wide"
          >
            Quiero entrar en preventa
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </a>
        </motion.div>
      </div>
    </section>
  );
}
