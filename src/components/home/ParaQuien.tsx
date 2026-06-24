"use client";

import { motion } from "framer-motion";

const avatares = [
  {
    icon: "🌾",
    titulo: "Agro y campo",
    descripcion: "Infraestructura lista para tu campo sin meses de obra. Galpones, depósitos, viviendas rurales e instalaciones operativas.",
    tags: ["Campo", "Rural", "Galpón"],
  },
  {
    icon: "📈",
    titulo: "Inversores",
    descripcion: "Transformá capital en renta en semanas. Ideal para cabañas turísticas, bungalows y desarrollos inmobiliarios.",
    tags: ["Renta", "Turismo", "ROI rápido"],
  },
  {
    icon: "🏡",
    titulo: "Primera vivienda",
    descripcion: "Una nueva forma de acceder a tu casa. Precio fijo, garantía por escrito, y tu hogar listo sin la incertidumbre de la construcción.",
    tags: ["Vivienda", "Familia", "Accesible"],
  },
  {
    icon: "🏢",
    titulo: "Empresas",
    descripcion: "Oficinas y espacios corporativos en tiempo récord. Soluciones para sedes, salas de reuniones, depósitos y expansión rápida.",
    tags: ["Corporativo", "Oficina", "Expansión"],
  },
];

export default function ParaQuien() {
  return (
    <section className="py-24 bg-stone-50">
      <div className="max-w-6xl mx-auto px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-14"
        >
          <span className="text-xs font-semibold uppercase tracking-widest text-sage-500 mb-3 block">
            ¿Para quién es MOVARA?
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-[#2F2F2F] leading-tight">
            Un espacio para cada proyecto
          </h2>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {avatares.map((a, i) => (
            <motion.div
              key={a.titulo}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="bg-white border border-stone-100 rounded-2xl p-6 hover:border-sage-200 hover:shadow-lg hover:shadow-sage-500/5 transition-all duration-300 group"
            >
              <div className="w-12 h-12 rounded-xl bg-sage-50 border border-sage-100 flex items-center justify-center text-2xl mb-5 group-hover:bg-sage-100 transition-colors">
                {a.icon}
              </div>
              <h3 className="font-bold text-[#2F2F2F] text-base mb-2">{a.titulo}</h3>
              <p className="text-stone-500 text-sm leading-relaxed mb-4">{a.descripcion}</p>
              <div className="flex flex-wrap gap-1.5">
                {a.tags.map((tag) => (
                  <span key={tag} className="px-2 py-0.5 bg-stone-50 border border-stone-100 text-stone-400 text-[11px] font-medium rounded-full">
                    {tag}
                  </span>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
