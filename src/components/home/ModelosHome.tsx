"use client";

import { motion } from "framer-motion";
import Link from "next/link";

const modelos = [
  {
    nombre: "MOVARA 10ft",
    superficie: "18 m²",
    precio: "USD 15.000",
    slug: "movara-10ft",
    descripcion: "Compacto y eficiente. Ideal para studios, espacios de trabajo u hospedaje rural.",
    tags: ["Studio", "Trabajo", "Campo"],
    color: "from-sage-50 to-stone-50",
  },
  {
    nombre: "MOVARA 20ft",
    superficie: "37 m²",
    precio: "USD 22.000",
    slug: "movara-20ft",
    descripcion: "El equilibrio perfecto entre confort y precio. Primera vivienda o inversión turística.",
    tags: ["Vivienda", "Turismo", "Inversión"],
    color: "from-[#2F2F2F] to-stone-800",
    dark: true,
  },
  {
    nombre: "MOVARA 40ft",
    superficie: "74 m²",
    precio: "USD 35.000",
    slug: "movara-40ft",
    descripcion: "Máximo espacio y confort. Vivienda familiar, oficina corporativa o lodge premium.",
    tags: ["Familiar", "Corporativo", "Premium"],
    color: "from-sage-50 to-stone-50",
  },
];

export default function ModelosHome() {
  return (
    <section id="modelos" className="py-24 bg-white">
      <div className="max-w-6xl mx-auto px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-12"
        >
          <span className="text-xs font-semibold uppercase tracking-widest text-sage-500 mb-3 block">
            Línea de productos
          </span>
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <h2 className="text-3xl sm:text-4xl font-bold text-[#2F2F2F] leading-tight">
              Tres modelos. Un estándar.
            </h2>
            <Link
              href="/modelos"
              className="text-sm font-semibold text-sage-600 hover:text-sage-700 underline underline-offset-4 shrink-0"
            >
              Ver catálogo completo →
            </Link>
          </div>
        </motion.div>

        <div className="space-y-5">
          {modelos.map((m, i) => (
            <motion.div
              key={m.nombre}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className={`rounded-2xl bg-gradient-to-r ${m.color} border ${
                m.dark ? "border-stone-700" : "border-stone-100"
              } overflow-hidden`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center gap-6 p-6 sm:p-8">
                {/* Imagen placeholder */}
                <div
                  className={`shrink-0 w-full sm:w-40 h-32 sm:h-28 rounded-xl flex items-center justify-center text-4xl ${
                    m.dark ? "bg-stone-700" : "bg-stone-100"
                  }`}
                >
                  🏠
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <h3 className={`text-xl font-bold ${m.dark ? "text-white" : "text-[#2F2F2F]"}`}>
                      {m.nombre}
                    </h3>
                    {m.tags.map((tag) => (
                      <span
                        key={tag}
                        className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                          m.dark
                            ? "bg-stone-700 text-stone-300"
                            : "bg-stone-100 text-stone-500"
                        }`}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  <p className={`text-sm leading-relaxed ${m.dark ? "text-stone-400" : "text-stone-500"}`}>
                    {m.descripcion}
                  </p>
                </div>

                {/* Precio + CTA */}
                <div className="shrink-0 flex flex-row sm:flex-col items-center sm:items-end gap-4 sm:gap-3">
                  <div className="text-right">
                    <p className={`text-xs ${m.dark ? "text-stone-500" : "text-stone-400"}`}>
                      {m.superficie} · desde
                    </p>
                    <p className={`text-2xl font-bold ${m.dark ? "text-white" : "text-[#2F2F2F]"}`}>
                      {m.precio}
                    </p>
                  </div>
                  <Link
                    href="/modelos"
                    className={`whitespace-nowrap px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                      m.dark
                        ? "bg-sage-500 hover:bg-sage-400 text-white"
                        : "bg-[#2F2F2F] hover:bg-stone-700 text-white"
                    }`}
                  >
                    Ver más
                  </Link>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
