"use client";

import { motion } from "framer-motion";
import Link from "next/link";

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.7, delay, ease: "easeOut" as const },
});

type Stat = { value: string; label: string };

type HeroData = {
  badgeText?: string | null;
  title?: string | null;
  subtitle?: string | null;
  ctaPrimaryText?: string | null;
  ctaSecondaryText?: string | null;
  stats?: Stat[] | null;
};

const FALLBACK_STATS: Stat[] = [
  { value: "+50", label: "casas entregadas" },
  { value: "60 días", label: "entrega promedio" },
  { value: "5 años", label: "garantía" },
];

export default function Hero({ data }: { data?: HeroData | null }) {
  const badgeText = data?.badgeText ?? "Fabricación 100% argentina";
  const title = data?.title ?? "Tu casa, en 60 días. Sin obra.";
  const subtitle =
    data?.subtitle ??
    "Estamos repensando la forma de habitar. Casas modulares llave en mano, diseñadas y fabricadas en planta, instaladas en tu terreno.";
  const ctaPrimaryText = data?.ctaPrimaryText ?? "Encontrá tu modelo";
  const ctaSecondaryText = data?.ctaSecondaryText ?? "Ver modelos";
  const stats = data?.stats?.length ? data.stats : FALLBACK_STATS;

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden bg-white">
      {/* Subtle dot grid */}
      <div
        className="absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage: "radial-gradient(circle, #2F2F2F 1px, transparent 1px)",
          backgroundSize: "44px 44px",
        }}
      />

      {/* Soft gold glow — top right */}
      <div className="absolute top-0 right-0 w-[560px] h-[560px] bg-sage-100 rounded-full blur-[120px] opacity-60 pointer-events-none" />
      {/* Soft gold glow — bottom left */}
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-sage-50 rounded-full blur-[100px] opacity-80 pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-6 lg:px-8 pt-28 pb-20 lg:py-0 grid lg:grid-cols-2 gap-12 lg:gap-20 items-center min-h-screen">
        {/* Copy */}
        <div>
          <motion.div {...fadeUp(0.05)}>
            <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-sage-100 border border-sage-200 text-sage-700 text-sm font-medium mb-7">
              <span className="w-1.5 h-1.5 rounded-full bg-sage-500 animate-pulse" />
              {badgeText}
            </span>
          </motion.div>

          <motion.h1
            {...fadeUp(0.12)}
            className="text-[2.75rem] sm:text-6xl lg:text-[4.5rem] font-bold text-[#2F2F2F] leading-[1.07] tracking-tight"
          >
            {title}
          </motion.h1>

          <motion.p
            {...fadeUp(0.2)}
            className="mt-6 text-lg text-stone-500 leading-relaxed max-w-lg"
          >
            {subtitle}
          </motion.p>

          <motion.div {...fadeUp(0.28)} className="mt-10 flex flex-wrap gap-4">
            <Link
              href="/configurador"
              className="inline-flex items-center gap-2 px-7 py-3.5 bg-sage-500 hover:bg-sage-600 text-white font-semibold rounded-xl transition-all duration-200 hover:shadow-xl hover:shadow-sage-500/25 hover:-translate-y-0.5 text-sm"
            >
              {ctaPrimaryText}
              <ArrowRightIcon />
            </Link>
            <Link
              href="/modelos"
              className="inline-flex items-center gap-2 px-7 py-3.5 border-2 border-sage-300 hover:border-sage-500 text-sage-600 hover:text-sage-700 font-semibold rounded-xl transition-all duration-200 text-sm bg-white hover:bg-sage-50"
            >
              {ctaSecondaryText}
            </Link>
          </motion.div>

          <motion.div {...fadeUp(0.38)} className="mt-12 flex flex-wrap gap-8">
            {stats.map(({ value, label }) => (
              <div key={label}>
                <p className="text-2xl font-bold text-sage-500">{value}</p>
                <p className="text-stone-400 text-xs mt-0.5">{label}</p>
              </div>
            ))}
          </motion.div>
        </div>

        {/* House visual */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.15, ease: "easeOut" as const }}
          className="hidden lg:flex items-center justify-center"
        >
          <HouseCard />
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1"
      >
        <span className="text-stone-400 text-xs tracking-widest uppercase">Scroll</span>
        <motion.div
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" as const }}
          className="w-px h-10 bg-gradient-to-b from-stone-300 to-transparent"
        />
      </motion.div>
    </section>
  );
}

function HouseCard() {
  return (
    <div className="relative w-full max-w-md">
      <div className="relative bg-white border border-sage-200 rounded-2xl p-7 shadow-2xl shadow-sage-900/8">
        <svg viewBox="0 0 360 280" className="w-full" fill="none" xmlns="http://www.w3.org/2000/svg">
          <line x1="30" y1="260" x2="330" y2="260" stroke="#E0CC9E" strokeWidth="1.5" strokeDasharray="4 6" />
          <rect x="55" y="145" width="250" height="115" rx="3" stroke="#CEBA82" strokeWidth="1.5" />
          <polyline points="35,145 180,55 325,145" stroke="#D4B06A" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
          <rect x="258" y="72" width="22" height="44" rx="2" stroke="#BF9A52" strokeWidth="1.5" />
          <rect x="255" y="69" width="28" height="6" rx="1" stroke="#BF9A52" strokeWidth="1.5" />
          <rect x="148" y="88" width="28" height="16" rx="1" stroke="#D4B06A" strokeWidth="1.5" opacity="0.9" />
          <line x1="162" y1="88" x2="162" y2="104" stroke="#D4B06A" strokeWidth="1" opacity="0.7" />
          <rect x="183" y="83" width="28" height="16" rx="1" stroke="#D4B06A" strokeWidth="1.5" opacity="0.9" />
          <line x1="197" y1="83" x2="197" y2="99" stroke="#D4B06A" strokeWidth="1" opacity="0.7" />
          <rect x="150" y="190" width="60" height="70" rx="4" stroke="#CEBA82" strokeWidth="1.5" />
          <line x1="180" y1="190" x2="180" y2="260" stroke="#CEBA82" strokeWidth="1" />
          <circle cx="202" cy="228" r="3.5" fill="#D4B06A" />
          <rect x="80" y="175" width="48" height="38" rx="3" stroke="#CEBA82" strokeWidth="1.5" />
          <line x1="104" y1="175" x2="104" y2="213" stroke="#CEBA82" strokeWidth="1" />
          <line x1="80" y1="194" x2="128" y2="194" stroke="#CEBA82" strokeWidth="1" />
          <rect x="232" y="175" width="48" height="38" rx="3" stroke="#CEBA82" strokeWidth="1.5" />
          <line x1="256" y1="175" x2="256" y2="213" stroke="#CEBA82" strokeWidth="1" />
          <line x1="232" y1="194" x2="280" y2="194" stroke="#CEBA82" strokeWidth="1" />
          <line x1="55" y1="272" x2="305" y2="272" stroke="#E0CC9E" strokeWidth="1" />
          <line x1="55" y1="268" x2="55" y2="276" stroke="#E0CC9E" strokeWidth="1" />
          <line x1="305" y1="268" x2="305" y2="276" stroke="#E0CC9E" strokeWidth="1" />
          <text x="180" y="278" textAnchor="middle" fill="#BF9A52" fontSize="9" fontFamily="monospace">35 — 120 m²</text>
        </svg>

        <div className="mt-5 grid grid-cols-3 gap-3">
          {[
            { value: "60-90", unit: "días", label: "Entrega" },
            { value: "5", unit: "años", label: "Garantía" },
            { value: "100%", unit: "", label: "Nacional" },
          ].map(({ value, unit, label }) => (
            <div key={label} className="text-center bg-sage-50 border border-sage-100 rounded-lg py-2.5">
              <div className="text-[#2F2F2F] font-bold text-sm">
                {value}
                <span className="text-sage-500 text-xs ml-0.5">{unit}</span>
              </div>
              <div className="text-stone-400 text-[10px] mt-0.5">{label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="absolute -top-4 -right-4 bg-sage-500 text-white text-xs font-bold px-3.5 py-1.5 rounded-full shadow-lg shadow-sage-500/30">
        Desde USD 17.000
      </div>

      <div className="absolute -z-10 inset-0 bg-sage-100 rounded-2xl border border-sage-200 translate-x-3 translate-y-3" />
    </div>
  );
}

function ArrowRightIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}
