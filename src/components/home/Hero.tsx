"use client";

import { motion } from "framer-motion";

type HeroContent = {
  badgePreventa?: string;
  titulo?: string;
  tituloDestacado?: string;
  subtitulo?: string;
  ctaPrimario?: string;
  ctaSecundario?: string;
  trustStrip?: string[];
};

const DEFAULTS = {
  badgePreventa: "Preventa activa — Acceso prioritario limitado",
  titulo: "Infraestructura habitacional premium.",
  tituloDestacado: "Lista en semanas.",
  subtitulo:
    "Las primeras unidades MOVARA están disponibles con condiciones exclusivas de preventa. Estamos habilitando acceso prioritario a clientes seleccionados antes de la apertura oficial.",
  ctaPrimario: "Quiero acceso prioritario",
  ctaSecundario: "Reservar precio de lanzamiento",
  trustStrip: ["Estructura certificada CE", "Lana de roca 75mm", "DVH con RPT", "Garantía escrita"],
};

export default function Hero({
  waNumber: _,
  content,
}: {
  waNumber?: string | null;
  content?: HeroContent | null;
}) {
  const c = { ...DEFAULTS, ...content };

  return (
    <section className="relative min-h-screen flex items-center bg-[#1A1A1A] overflow-hidden">
      {/* Dot texture */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: "radial-gradient(circle, #D4B06A 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />
      {/* Golden glow */}
      <div className="absolute top-1/3 right-1/3 w-[800px] h-[800px] rounded-full bg-[#D4B06A] blur-[200px] opacity-[0.05] pointer-events-none" />

      <div className="relative max-w-5xl mx-auto px-6 lg:px-8 py-32 w-full text-center">
        {/* Preventa badge */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="inline-flex items-center gap-2.5 px-5 py-2 rounded-full border border-[#D4B06A]/40 bg-[#D4B06A]/8 text-[#D4B06A] text-xs font-semibold tracking-widest uppercase mb-12"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[#D4B06A] animate-pulse" />
          {c.badgePreventa}
        </motion.div>

        {/* H1 */}
        <motion.h1
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.08 }}
          className="text-5xl sm:text-6xl lg:text-[5rem] font-bold text-white leading-[1.04] tracking-tight mb-8"
        >
          {c.titulo}
          <br />
          <span className="text-[#D4B06A]">{c.tituloDestacado}</span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-lg sm:text-xl text-stone-400 max-w-2xl mx-auto leading-relaxed mb-14"
        >
          {c.subtitulo}
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="flex flex-col sm:flex-row gap-4 justify-center mb-20"
        >
          <a
            href="#dossier"
            className="px-9 py-4 bg-[#D4B06A] hover:bg-[#BF9A52] text-[#1A1A1A] font-bold rounded-xl transition-all duration-200 hover:shadow-2xl hover:shadow-[#D4B06A]/30 hover:-translate-y-0.5 text-sm tracking-wide"
          >
            {c.ctaPrimario}
          </a>
          <a
            href="#preventa"
            className="px-9 py-4 border border-white/20 hover:border-[#D4B06A]/60 text-white font-semibold rounded-xl transition-all duration-200 text-sm hover:bg-white/5"
          >
            {c.ctaSecundario}
          </a>
        </motion.div>

        {/* Trust strip */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.55 }}
          className="flex flex-wrap justify-center gap-x-10 gap-y-3 text-stone-600 text-[11px] tracking-widest uppercase"
        >
          {(c.trustStrip ?? DEFAULTS.trustStrip).map((item) => (
            <span key={item} className="flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-[#D4B06A]" />
              {item}
            </span>
          ))}
        </motion.div>
      </div>

      {/* Scroll cue */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.6 }}
        className="absolute bottom-10 left-1/2 -translate-x-1/2"
      >
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="w-px h-14 bg-gradient-to-b from-stone-600 to-transparent mx-auto"
        />
      </motion.div>
    </section>
  );
}
