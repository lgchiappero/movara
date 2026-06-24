"use client";

import { motion } from "framer-motion";

const avatares = [
  {
    icon: "🌾",
    titulo: "Agro y campo",
    descripcion: "Galpones, depósitos y viviendas rurales listos en semanas, sin obra.",
  },
  {
    icon: "📈",
    titulo: "Inversores",
    descripcion: "Transformá capital en renta con cabañas turísticas o bungalows en tiempo récord.",
  },
  {
    icon: "🏡",
    titulo: "Primera vivienda",
    descripcion: "Tu casa con precio fijo y garantía por escrito, sin la incertidumbre de la construcción.",
  },
  {
    icon: "🏢",
    titulo: "Empresas",
    descripcion: "Oficinas, depósitos y sedes corporativas instaladas sin obra en tu terreno.",
  },
];

export default function ParaQuien() {
  return (
    <section className="py-32 bg-stone-50">
      <div className="max-w-5xl mx-auto px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="text-xs font-semibold uppercase tracking-widest text-sage-500 mb-4 block">
            ¿Para quién es MOVARA?
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-[#2F2F2F] leading-tight">
            Un espacio para cada proyecto
          </h2>
        </motion.div>

        <div className="grid sm:grid-cols-2 gap-6">
          {avatares.map((a, i) => (
            <motion.div
              key={a.titulo}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="bg-white border border-stone-100 rounded-2xl p-10 hover:border-sage-200 hover:shadow-lg hover:shadow-sage-500/5 transition-all duration-300"
            >
              <div className="text-5xl mb-6">{a.icon}</div>
              <h3 className="font-bold text-[#2F2F2F] text-xl mb-3">{a.titulo}</h3>
              <p className="text-stone-500 text-base leading-relaxed">{a.descripcion}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
