"use client";

import { motion } from "framer-motion";

const badges = [
  { icon: "🏗️", label: "Estructura certificada CE" },
  { icon: "🌡️", label: "Aislación lana de roca" },
  { icon: "🪟", label: "DVH con RPT" },
  { icon: "📜", label: "Garantía escrita" },
  { icon: "🇦🇷", label: "Producción nacional" },
  { icon: "🚚", label: "Envío a todo el país" },
];

export default function PruebaSocial() {
  return (
    <section className="py-20 bg-stone-50 border-y border-stone-100">
      <div className="max-w-5xl mx-auto px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-10"
        >
          <span className="text-xs font-semibold uppercase tracking-widest text-sage-500 mb-3 block">
            Estándares MOVARA
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-[#2F2F2F]">
            Calidad que podés verificar
          </h2>
        </motion.div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-12">
          {badges.map((b, i) => (
            <motion.div
              key={b.label}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.07 }}
              className="flex flex-col items-center gap-2 p-4 bg-white border border-stone-100 rounded-xl text-center hover:border-sage-200 transition-colors"
            >
              <span className="text-2xl">{b.icon}</span>
              <span className="text-xs font-medium text-stone-600 leading-tight">{b.label}</span>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 p-6 bg-white border border-stone-100 rounded-2xl"
        >
          <div className="w-10 h-10 rounded-xl bg-sage-100 flex items-center justify-center text-xl shrink-0">
            📍
          </div>
          <div className="text-center sm:text-left">
            <p className="font-semibold text-[#2F2F2F] text-sm">Showroom próximamente en Sunchales, Santa Fe</p>
            <p className="text-stone-400 text-xs mt-0.5">
              Vas a poder recorrer un modelo real, tocar los materiales y hablar con nuestro equipo.
            </p>
          </div>
          <span className="sm:ml-auto px-3 py-1 bg-sage-100 text-sage-700 text-xs font-semibold rounded-full whitespace-nowrap">
            Próximamente
          </span>
        </motion.div>
      </div>
    </section>
  );
}
