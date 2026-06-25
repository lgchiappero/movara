"use client";

import { motion } from "framer-motion";

const items = [
  {
    negacion: "No es una casa prefabricada",
    descripcion:
      "Las casas prefabricadas tradicionales usan materiales livianos, baja calidad térmica y vida útil limitada. MOVARA usa estructura de acero Q235B con certificación CE europea.",
  },
  {
    negacion: "No es un container adaptado",
    descripcion:
      "Los containers son unidades industriales con serias limitaciones térmicas y de habitabilidad. MOVARA es diseñada desde cero para ser confortable en cualquier clima argentino.",
  },
  {
    negacion: "Es infraestructura habitacional de precisión",
    es: true,
    descripcion:
      "Fabricada en planta bajo estrictos controles de calidad. Aislación de lana de roca 75mm, doble vidriado hermético con RPT y acabados de primera línea. Llave en mano.",
  },
];

export default function NuevaCategoria() {
  return (
    <section className="py-32 bg-stone-50">
      <div className="max-w-5xl mx-auto px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-20"
        >
          <span className="text-xs font-semibold uppercase tracking-widest text-[#D4B06A] mb-5 block">
            Una nueva categoría
          </span>
          <h2 className="text-4xl sm:text-5xl font-bold text-[#2F2F2F] leading-tight max-w-3xl mx-auto">
            MOVARA no entra en ninguna categoría que ya conocés.
          </h2>
          <p className="mt-6 text-lg text-stone-500 max-w-xl mx-auto leading-relaxed">
            Es una nueva forma de pensar la infraestructura habitacional en Argentina.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-6 mb-20">
          {items.map((item, i) => (
            <motion.div
              key={item.negacion}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.12 }}
              className={`rounded-2xl p-8 lg:p-10 border-2 ${
                item.es
                  ? "bg-[#2F2F2F] border-[#D4B06A]"
                  : "bg-white border-stone-100"
              }`}
            >
              <div className={`w-8 h-px mb-8 ${item.es ? "bg-[#D4B06A]" : "bg-stone-200"}`} />
              <h3
                className={`font-bold text-lg mb-5 leading-snug ${
                  item.es ? "text-white" : "text-stone-400 line-through decoration-stone-300"
                }`}
              >
                {item.negacion}
              </h3>
              <p className={`text-sm leading-relaxed ${item.es ? "text-stone-400" : "text-stone-500"}`}>
                {item.descripcion}
              </p>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <p className="text-2xl lg:text-3xl font-bold text-[#2F2F2F] max-w-2xl mx-auto leading-snug">
            "No estamos compitiendo con la construcción tradicional.
            <span className="text-[#D4B06A]"> Estamos reemplazándola."</span>
          </p>
        </motion.div>
      </div>
    </section>
  );
}
