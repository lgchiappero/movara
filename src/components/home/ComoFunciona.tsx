"use client";

import { motion } from "framer-motion";
import Link from "next/link";

const pasos = [
  {
    numero: "01",
    titulo: "Configurás tu espacio online",
    descripcion: "Elegís tu modelo, provincia y uso. Nuestro configurador te recomienda el estándar térmico ideal para tu zona.",
    icon: "🖥️",
  },
  {
    numero: "02",
    titulo: "Recibís tu presupuesto personalizado",
    descripcion: "En menos de 2 horas te enviamos un presupuesto detallado con precio fijo, sin letra chica.",
    icon: "📋",
  },
  {
    numero: "03",
    titulo: "Coordinamos producción y envío",
    descripcion: "Tu espacio se fabrica en planta bajo estrictos controles de calidad. Coordinamos la logística hasta tu terreno.",
    icon: "🏭",
  },
  {
    numero: "04",
    titulo: "Tu MOVARA llega lista para instalarse",
    descripcion: "Instalación en tu terreno sin obra. Sin escombros, sin demoras, sin sorpresas. Garantía escrita incluida.",
    icon: "🏠",
  },
];

export default function ComoFunciona() {
  return (
    <section id="proceso" className="py-24 bg-white">
      <div className="max-w-6xl mx-auto px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="text-xs font-semibold uppercase tracking-widest text-sage-500 mb-3 block">
            Proceso
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-[#2F2F2F] leading-tight">
            De la idea al espacio en 4 pasos
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {pasos.map((paso, i) => (
            <motion.div
              key={paso.numero}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.12 }}
              className="relative"
            >
              {/* Connector line */}
              {i < pasos.length - 1 && (
                <div className="hidden lg:block absolute top-8 left-full w-full h-px bg-gradient-to-r from-sage-200 to-transparent z-0 -translate-y-px" />
              )}

              <div className="relative z-10 bg-stone-50 border border-stone-100 rounded-2xl p-6 h-full hover:border-sage-200 hover:shadow-md transition-all duration-300">
                <div className="flex items-start justify-between mb-4">
                  <span className="text-3xl">{paso.icon}</span>
                  <span className="text-3xl font-bold text-stone-100 leading-none">{paso.numero}</span>
                </div>
                <h3 className="font-bold text-[#2F2F2F] text-base mb-2 leading-snug">{paso.titulo}</h3>
                <p className="text-stone-500 text-sm leading-relaxed">{paso.descripcion}</p>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="text-center mt-12"
        >
          <Link
            href="/configurador"
            className="inline-flex items-center gap-2 px-7 py-3.5 bg-sage-500 hover:bg-sage-600 text-white font-semibold rounded-xl transition-all duration-200 hover:shadow-xl hover:shadow-sage-500/25 hover:-translate-y-0.5 text-sm"
          >
            Empezar ahora
            <ArrowRightIcon />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}

function ArrowRightIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}
