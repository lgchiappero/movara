"use client";

import { motion } from "framer-motion";
import Link from "next/link";

type SanityModelo = {
  _id: string;
  name: string;
  slug?: string;
  descripcion?: string;
  tamano?: string;
  size?: number;
  priceUSD?: number;
  tagsLanding?: string[];
  disponiblesPreventa?: number;
  destacado?: boolean;
};

type ModelosHomeContent = {
  badgeSeccion?: string;
  titulo?: string;
  badgePreventa?: string;
  ctaReservar?: string;
  ctaCatalogo?: string;
};

const TAMANO_SURFACE: Record<string, string> = {
  "10ft": "18 m²",
  "20ft": "37 m²",
  "40ft": "74 m²",
};

function formatPrice(usd: number) {
  return `USD ${usd.toLocaleString("es-AR")}`;
}

const HARDCODED_MODELOS = [
  {
    _id: "10ft",
    name: "MOVARA 10ft",
    superficie: "18 m²",
    precio: "USD 15.000",
    descripcion: "Studio de alta eficiencia. Ideal para hospedaje, trabajo remoto o inversión turística en campo.",
    tags: ["Studio", "Trabajo", "Campo"],
    disponibles: 4,
    highlight: false,
  },
  {
    _id: "20ft",
    name: "MOVARA 20ft",
    superficie: "37 m²",
    precio: "USD 22.000",
    descripcion: "El equilibrio perfecto entre confort y precio. Primera vivienda o inversión turística con alto ROI.",
    tags: ["Vivienda", "Turismo", "Inversión"],
    disponibles: 8,
    highlight: true,
  },
  {
    _id: "40ft",
    name: "MOVARA 40ft",
    superficie: "74 m²",
    precio: "USD 35.000",
    descripcion: "Máximo espacio y confort. Vivienda familiar, oficina corporativa o lodge premium.",
    tags: ["Familiar", "Corporativo", "Premium"],
    disponibles: 3,
    highlight: false,
  },
];

export default function ModelosHome({
  content,
  modelos,
}: {
  content?: ModelosHomeContent | null;
  modelos?: SanityModelo[] | null;
}) {
  const badgeSeccion = content?.badgeSeccion ?? "Línea de productos — Edición Fundadores";
  const titulo = content?.titulo ?? "Tres modelos. Un estándar.";
  const badgePreventa = content?.badgePreventa ?? "⚡ Condiciones de preventa activas";
  const ctaReservar = content?.ctaReservar ?? "Reservar precio";
  const ctaCatalogo = content?.ctaCatalogo ?? "Ver catálogo completo →";

  const useSanity = modelos && modelos.length > 0;

  return (
    <section id="modelos" className="py-32 bg-white">
      <div className="max-w-5xl mx-auto px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-14"
        >
          <div>
            <span className="text-xs font-semibold uppercase tracking-widest text-[#D4B06A] mb-4 block">
              {badgeSeccion}
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-[#2F2F2F] leading-tight">
              {titulo}
            </h2>
          </div>
          <div className="shrink-0 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-xl">
            <p className="text-xs font-semibold text-amber-700 whitespace-nowrap">
              {badgePreventa}
            </p>
          </div>
        </motion.div>

        {/* Cards */}
        <div className="space-y-4">
          {useSanity
            ? modelos.map((m, i) => {
                const superficie =
                  m.size ? `${m.size} m²` : (m.tamano ? TAMANO_SURFACE[m.tamano] ?? m.tamano : "—");
                const precio = m.priceUSD ? formatPrice(m.priceUSD) : "—";
                const tags = m.tagsLanding ?? [];
                const highlight = m.destacado ?? false;

                return (
                  <motion.div
                    key={m._id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: i * 0.1 }}
                    className={`rounded-2xl border-2 p-7 lg:p-8 flex flex-col sm:flex-row sm:items-center gap-6 transition-all duration-200 ${
                      highlight
                        ? "bg-[#2F2F2F] border-[#D4B06A]"
                        : "bg-white border-stone-100 hover:border-stone-200"
                    }`}
                  >
                    <div
                      className={`shrink-0 w-14 h-14 rounded-xl flex items-center justify-center text-3xl ${
                        highlight ? "bg-[#D4B06A]/10" : "bg-stone-50"
                      }`}
                    >
                      🏠
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2.5 mb-2 flex-wrap">
                        <h3 className={`font-bold text-lg ${highlight ? "text-white" : "text-[#2F2F2F]"}`}>
                          {m.name}
                        </h3>
                        {tags.map((tag) => (
                          <span
                            key={tag}
                            className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                              highlight
                                ? "bg-[#D4B06A]/20 text-[#D4B06A]"
                                : "bg-stone-100 text-stone-500"
                            }`}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                      {m.descripcion && (
                        <p className={`text-sm leading-relaxed mb-2 ${highlight ? "text-stone-400" : "text-stone-500"}`}>
                          {m.descripcion}
                        </p>
                      )}
                      {!!m.disponiblesPreventa && (
                        <p className={`text-xs font-medium ${highlight ? "text-[#D4B06A]/70" : "text-amber-600"}`}>
                          Solo quedan <strong>{m.disponiblesPreventa}</strong> unidades con precio de lanzamiento
                        </p>
                      )}
                    </div>
                    <div className="shrink-0 text-right">
                      <p className={`text-xs mb-1 ${highlight ? "text-stone-500" : "text-stone-400"}`}>
                        {superficie} · desde
                      </p>
                      <p className={`text-2xl font-bold mb-3 ${highlight ? "text-white" : "text-[#2F2F2F]"}`}>
                        {precio}
                      </p>
                      <a
                        href="#dossier"
                        className={`inline-block px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${
                          highlight
                            ? "bg-[#D4B06A] hover:bg-[#BF9A52] text-[#1A1A1A]"
                            : "bg-[#2F2F2F] hover:bg-stone-800 text-white"
                        }`}
                      >
                        {ctaReservar}
                      </a>
                    </div>
                  </motion.div>
                );
              })
            : HARDCODED_MODELOS.map((m, i) => (
                <motion.div
                  key={m._id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  className={`rounded-2xl border-2 p-7 lg:p-8 flex flex-col sm:flex-row sm:items-center gap-6 transition-all duration-200 ${
                    m.highlight
                      ? "bg-[#2F2F2F] border-[#D4B06A]"
                      : "bg-white border-stone-100 hover:border-stone-200"
                  }`}
                >
                  <div
                    className={`shrink-0 w-14 h-14 rounded-xl flex items-center justify-center text-3xl ${
                      m.highlight ? "bg-[#D4B06A]/10" : "bg-stone-50"
                    }`}
                  >
                    🏠
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 mb-2 flex-wrap">
                      <h3 className={`font-bold text-lg ${m.highlight ? "text-white" : "text-[#2F2F2F]"}`}>
                        {m.name}
                      </h3>
                      {m.tags.map((tag) => (
                        <span
                          key={tag}
                          className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                            m.highlight
                              ? "bg-[#D4B06A]/20 text-[#D4B06A]"
                              : "bg-stone-100 text-stone-500"
                          }`}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    <p className={`text-sm leading-relaxed mb-2 ${m.highlight ? "text-stone-400" : "text-stone-500"}`}>
                      {m.descripcion}
                    </p>
                    <p className={`text-xs font-medium ${m.highlight ? "text-[#D4B06A]/70" : "text-amber-600"}`}>
                      Solo quedan <strong>{m.disponibles}</strong> unidades con precio de lanzamiento
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className={`text-xs mb-1 ${m.highlight ? "text-stone-500" : "text-stone-400"}`}>
                      {m.superficie} · desde
                    </p>
                    <p className={`text-2xl font-bold mb-3 ${m.highlight ? "text-white" : "text-[#2F2F2F]"}`}>
                      {m.precio}
                    </p>
                    <a
                      href="#dossier"
                      className={`inline-block px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${
                        m.highlight
                          ? "bg-[#D4B06A] hover:bg-[#BF9A52] text-[#1A1A1A]"
                          : "bg-[#2F2F2F] hover:bg-stone-800 text-white"
                      }`}
                    >
                      {ctaReservar}
                    </a>
                  </div>
                </motion.div>
              ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="text-center mt-10"
        >
          <Link
            href="/modelos"
            className="text-sm text-stone-400 hover:text-[#2F2F2F] transition-colors underline underline-offset-4"
          >
            {ctaCatalogo}
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
