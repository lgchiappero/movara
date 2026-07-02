"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import FaqAccordion from "@/components/faq/FaqAccordion";
import { FAQ_CATEGORIES, type FaqCategory } from "@/data/faq";

const PREGUNTAS_POR_CATEGORIA = 3;

export default function FAQ({ categorias }: { categorias?: FaqCategory[] | null }) {
  const categories = categorias?.length ? categorias : FAQ_CATEGORIES;

  return (
    <section className="py-24 bg-[#F2F2F2]">
      <div className="max-w-5xl mx-auto px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="text-xs font-semibold uppercase tracking-widest text-sage-600 mb-4 block">
            Preguntas frecuentes
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-[#2F2F2F] leading-tight">
            Lo que más nos preguntan
          </h2>
        </motion.div>

        <div className="grid sm:grid-cols-2 gap-x-8 gap-y-10">
          {categories.map((categoria, i) => (
            <motion.div
              key={categoria._key ?? categoria.titulo}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45, delay: (i % 2) * 0.08 }}
              className="bg-white rounded-2xl border border-stone-200 px-6"
            >
              <div className="flex items-center gap-3 pt-6 pb-2">
                {categoria.icono && <span className="text-2xl leading-none">{categoria.icono}</span>}
                <h3 className="font-bold text-[#2F2F2F] text-lg">{categoria.titulo}</h3>
              </div>
              <FaqAccordion items={categoria.preguntas.slice(0, PREGUNTAS_POR_CATEGORIA)} />
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-center mt-12"
        >
          <Link
            href="/faq"
            className="inline-flex items-center gap-2 text-sage-600 font-semibold text-sm hover:text-sage-700 transition-colors"
          >
            Ver todas las preguntas
            <span className="text-xs">→</span>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
