"use client";

import { motion } from "framer-motion";

const columns = [
  {
    label: "Construcción tradicional",
    icon: "🧱",
    highlight: false,
    items: [
      { text: "12–24 meses", bad: true },
      { text: "Precio impredecible", bad: true },
      { text: "Sin garantía real", bad: true },
      { text: "Obra sucia en tu terreno", bad: true },
      { text: "Presupuestos que se van de precio", bad: true },
    ],
  },
  {
    label: "Container genérico",
    icon: "📦",
    highlight: false,
    items: [
      { text: "2–4 meses", bad: false },
      { text: "Aislación deficiente", bad: true },
      { text: "Personalización mínima", bad: true },
      { text: "Difícil de habitar en verano", bad: true },
      { text: "Sin garantía escrita", bad: true },
    ],
  },
  {
    label: "MOVARA",
    icon: "✦",
    highlight: true,
    items: [
      { text: "4–8 semanas", bad: false },
      { text: "Precio fijo desde el día 1", bad: false },
      { text: "Lana de roca 75mm", bad: false },
      { text: "Garantía por escrito", bad: false },
      { text: "Llave en mano, sin obra", bad: false },
    ],
  },
];

export default function PropuestaDeValor() {
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
            ¿Por qué MOVARA?
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-[#2F2F2F] leading-tight">
            No todas las soluciones son iguales
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-5">
          {columns.map((col, i) => (
            <motion.div
              key={col.label}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.12 }}
              className={`rounded-2xl p-6 border-2 ${
                col.highlight
                  ? "bg-[#2F2F2F] border-sage-500 shadow-2xl shadow-sage-500/10"
                  : "bg-white border-stone-100"
              }`}
            >
              <div className="flex items-center gap-3 mb-6">
                <span className={`text-2xl ${col.highlight ? "" : "grayscale opacity-60"}`}>
                  {col.icon}
                </span>
                <h3
                  className={`font-bold text-sm ${
                    col.highlight ? "text-white" : "text-stone-600"
                  }`}
                >
                  {col.label}
                </h3>
                {col.highlight && (
                  <span className="ml-auto px-2 py-0.5 bg-sage-500 text-white text-[10px] font-bold rounded-full uppercase tracking-wider">
                    Ideal
                  </span>
                )}
              </div>

              <ul className="space-y-3">
                {col.items.map(({ text, bad }) => (
                  <li key={text} className="flex items-start gap-2.5">
                    <span
                      className={`mt-0.5 shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        col.highlight
                          ? "bg-sage-500 text-white"
                          : bad
                          ? "bg-red-100 text-red-500"
                          : "bg-green-100 text-green-600"
                      }`}
                    >
                      {col.highlight ? "✓" : bad ? "✕" : "✓"}
                    </span>
                    <span
                      className={`text-sm leading-snug ${
                        col.highlight
                          ? "text-stone-300"
                          : bad
                          ? "text-stone-400 line-through decoration-stone-300"
                          : "text-stone-600"
                      }`}
                    >
                      {text}
                    </span>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-center mt-12 text-stone-500 text-lg font-medium max-w-xl mx-auto"
        >
          No vendemos metros cuadrados.{" "}
          <span className="text-[#2F2F2F] font-semibold">
            Diseñamos nuevas formas de vivir e invertir.
          </span>
        </motion.p>
      </div>
    </section>
  );
}
