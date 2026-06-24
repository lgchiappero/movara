"use client";

import { motion } from "framer-motion";

const columns = [
  {
    label: "Construcción tradicional",
    icon: "🧱",
    variant: "bad" as const,
    items: ["12–24 meses", "Precio impredecible", "Sin garantía real"],
  },
  {
    label: "Container genérico",
    icon: "📦",
    variant: "neutral" as const,
    items: ["2–4 meses", "Aislación deficiente", "Personalización mínima"],
  },
  {
    label: "MOVARA",
    icon: "✦",
    variant: "highlight" as const,
    items: ["4–8 semanas", "Precio fijo, sin sorpresas", "Garantía escrita incluida"],
  },
];

export default function PropuestaDeValor() {
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
            ¿Por qué MOVARA?
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-[#2F2F2F] leading-tight">
            No todas las soluciones son iguales
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6">
          {columns.map((col, i) => {
            const isHighlight = col.variant === "highlight";
            const isBad = col.variant === "bad";
            return (
              <motion.div
                key={col.label}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.12 }}
                className={`rounded-2xl p-8 lg:p-10 border-2 ${
                  isHighlight
                    ? "bg-[#2F2F2F] border-sage-500 shadow-2xl shadow-sage-500/15 scale-[1.02]"
                    : "bg-white border-stone-100"
                }`}
              >
                <div className="mb-8">
                  <span className={`text-3xl ${isHighlight ? "" : "grayscale opacity-50"}`}>
                    {col.icon}
                  </span>
                  <div className="flex items-center gap-2 mt-4">
                    <h3 className={`font-bold text-base ${isHighlight ? "text-white" : "text-stone-500"}`}>
                      {col.label}
                    </h3>
                    {isHighlight && (
                      <span className="px-2 py-0.5 bg-sage-500 text-white text-[10px] font-bold rounded-full uppercase tracking-wider">
                        Ideal
                      </span>
                    )}
                  </div>
                </div>

                <ul className="space-y-5">
                  {col.items.map((text) => (
                    <li key={text} className="flex items-center gap-3">
                      <span
                        className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                          isHighlight
                            ? "bg-sage-500 text-white"
                            : isBad
                            ? "bg-red-100 text-red-400"
                            : "bg-stone-100 text-stone-400"
                        }`}
                      >
                        {isHighlight ? "✓" : "✕"}
                      </span>
                      <span
                        className={`text-sm leading-snug ${
                          isHighlight
                            ? "text-stone-300"
                            : isBad
                            ? "text-stone-400 line-through decoration-stone-300"
                            : "text-stone-400"
                        }`}
                      >
                        {text}
                      </span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
