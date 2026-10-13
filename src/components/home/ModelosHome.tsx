"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import ModelosGrid from "@/components/modelos/ModelosGrid";
import type { ModeloCardData } from "@/components/modelos/ModeloCard";

type ModelosHomeContent = {
  titulo?: string;
  subtitulo?: string;
  ctaVerModelo?: string;
  ctaCatalogo?: string;
};

export default function ModelosHome({
  content,
  modelos,
}: {
  content?: ModelosHomeContent | null;
  modelos?: ModeloCardData[] | null;
}) {
  const titulo = content?.titulo ?? "Nuestros modelos";
  const subtitulo = content?.subtitulo ?? "Más modelos en camino.";
  const ctaVerModelo = content?.ctaVerModelo ?? "Ver modelo";
  const ctaCatalogo = content?.ctaCatalogo ?? "Ver catálogo completo";

  return (
    <section id="modelos" className="py-24 sm:py-32 bg-[#1A1A1A]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-14"
        >
          <span className="text-xs font-semibold uppercase tracking-widest text-[#D4B06A] mb-4 block">Catálogo</span>
          <h2 className="font-playfair font-medium text-3xl sm:text-4xl text-white mb-5">{titulo}</h2>
          <p className="text-stone-300 text-lg font-medium max-w-2xl mx-auto leading-relaxed">{subtitulo}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <ModelosGrid modelos={modelos ?? []} ctaLabel={ctaVerModelo} />
        </motion.div>

        <div className="text-center mt-12">
          <Link
            href="/modelos"
            className="inline-flex items-center px-6 py-3 rounded-xl border border-[#D4B06A]/60 text-[#D4B06A] text-sm font-semibold hover:bg-[#D4B06A]/10 hover:border-[#D4B06A] transition-colors"
          >
            {ctaCatalogo}
          </Link>
        </div>
      </div>
    </section>
  );
}
