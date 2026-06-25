"use client";

import { motion } from "framer-motion";

const stats = [
  { stat: "18 meses", label: "promedio de obra", sub: "mientras seguís pagando alquiler" },
  { stat: "40%", label: "sobrecosto habitual", sub: "vs. el presupuesto que te dieron" },
  { stat: "6+", label: "contratistas distintos", sub: "albañil, electricista, plomero, yesero…" },
  { stat: "∞", label: "imprevistos", sub: "tiempo, clima, materiales, conflictos" },
];

export default function DolorConvencional() {
  return (
    <section className="py-32 bg-white">
      <div className="max-w-5xl mx-auto px-6 lg:px-8">
        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-20"
        >
          <span className="text-xs font-semibold uppercase tracking-widest text-stone-400 mb-5 block">
            El problema
          </span>
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-[#2F2F2F] leading-[1.08] max-w-3xl">
            La construcción<br />
            tradicional está{" "}
            <span className="relative inline-block">
              rota.
              <span className="absolute inset-x-0 bottom-2 h-3 bg-red-100 -z-10 rounded" />
            </span>
          </h2>
        </motion.div>

        {/* Stats grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-px bg-stone-100 rounded-2xl overflow-hidden mb-20">
          {stats.map((d, i) => (
            <motion.div
              key={d.label}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="bg-white p-8 lg:p-10"
            >
              <p className="text-4xl lg:text-5xl font-bold text-[#2F2F2F] mb-2 leading-none">{d.stat}</p>
              <p className="text-sm font-semibold text-stone-700 mb-1">{d.label}</p>
              <p className="text-xs text-stone-400 leading-relaxed">{d.sub}</p>
            </motion.div>
          ))}
        </div>

        {/* Two-col comparison */}
        <div className="grid lg:grid-cols-2 gap-8 items-start">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <p className="text-xl text-stone-500 leading-relaxed mb-8">
              Cada obra en Argentina termina siendo un proyecto de gestión de crisis. No de construcción.
            </p>
            <ul className="space-y-4">
              {[
                "Presupuestos que se duplican antes de la mitad de la obra",
                "Obras que se detienen sin aviso durante semanas",
                "Calidad que depende del humor del contratista del mes",
                "Ningún responsable real cuando algo sale mal",
                "Tu terreno convertido en escombros por meses",
                "Estrés permanente. Cero certeza. Cero garantías.",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-stone-500 text-sm">
                  <span className="mt-1 w-4 h-4 rounded-full bg-red-50 border border-red-100 flex items-center justify-center text-[10px] text-red-400 shrink-0 font-bold">
                    ✕
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="bg-[#1A1A1A] rounded-2xl p-8 lg:p-10"
          >
            <p className="text-[#D4B06A] text-xs font-semibold uppercase tracking-widest mb-8">
              Con MOVARA
            </p>
            <ul className="space-y-5">
              {[
                "Precio fijo desde el día 1. Sin sorpresas.",
                "Entrega garantizada en 4–8 semanas.",
                "Un solo interlocutor, de inicio a fin.",
                "Producción en planta controlada. Sin obra en tu terreno.",
                "Garantía escrita. Sin letra chica.",
                "Certeza total. Desde antes de firmar.",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-stone-300 text-sm">
                  <span className="mt-1 w-4 h-4 rounded-full bg-[#D4B06A]/20 flex items-center justify-center text-[10px] text-[#D4B06A] shrink-0 font-bold">
                    ✓
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
