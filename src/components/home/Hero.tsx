"use client";

import { motion } from "framer-motion";
import Link from "next/link";

const WA_TEXT = encodeURIComponent("Hola, me interesa conocer más sobre las casas modulares de Habitatt.");

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.7, delay, ease: "easeOut" as const },
});

export default function Hero({ waNumber }: { waNumber?: string | null }) {
  const number = waNumber || process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "5491100000000";
  const WA_HREF = `https://wa.me/${number}?text=${WA_TEXT}`;
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden bg-sage-950">
      {/* Subtle dot grid */}
      <div
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage: "radial-gradient(circle, #819874 1px, transparent 1px)",
          backgroundSize: "44px 44px",
        }}
      />

      {/* Glow orbs */}
      <div className="absolute top-0 right-0 w-2/3 h-2/3 bg-gradient-to-bl from-sage-700/20 via-transparent to-transparent pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[480px] h-[480px] bg-sage-800/20 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-6 lg:px-8 pt-28 pb-20 lg:py-0 grid lg:grid-cols-2 gap-12 lg:gap-20 items-center min-h-screen">
        {/* Copy */}
        <div>
          <motion.div {...fadeUp(0.05)}>
            <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-sage-800/60 border border-sage-700/50 text-sage-400 text-sm font-medium mb-7">
              <span className="w-1.5 h-1.5 rounded-full bg-sage-500 animate-pulse" />
              Fabricación 100% argentina
            </span>
          </motion.div>

          <motion.h1
            {...fadeUp(0.12)}
            className="text-[2.75rem] sm:text-6xl lg:text-[4.5rem] font-bold text-white leading-[1.07] tracking-tight"
          >
            Tu casa,{" "}
            <span className="text-sage-400">en 60 días.</span>{" "}
            Sin obra.
          </motion.h1>

          <motion.p
            {...fadeUp(0.2)}
            className="mt-6 text-lg text-stone-400 leading-relaxed max-w-lg"
          >
            Casas modulares llave en mano. Diseñadas y fabricadas en planta,
            instaladas en tu terreno. Calidad superior, precio justo, entrega
            garantizada por contrato.
          </motion.p>

          <motion.div {...fadeUp(0.28)} className="mt-10 flex flex-wrap gap-4">
            <Link
              href="/modelos"
              className="inline-flex items-center gap-2 px-7 py-3.5 bg-sage-600 hover:bg-sage-500 text-white font-semibold rounded-xl transition-all duration-200 hover:shadow-xl hover:shadow-sage-600/25 hover:-translate-y-0.5 text-sm"
            >
              Ver modelos
              <ArrowRightIcon />
            </Link>
            <a
              href={WA_HREF}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-7 py-3.5 border border-white/15 hover:border-white/30 bg-white/5 hover:bg-white/10 text-white font-semibold rounded-xl transition-all duration-200 text-sm"
            >
              <WhatsAppIcon />
              Consultar por WhatsApp
            </a>
          </motion.div>

          <motion.div {...fadeUp(0.38)} className="mt-12 flex flex-wrap gap-8">
            {[
              { value: "+50", label: "casas entregadas" },
              { value: "60 días", label: "entrega promedio" },
              { value: "5 años", label: "garantía" },
            ].map(({ value, label }) => (
              <div key={label}>
                <p className="text-2xl font-bold text-sage-400">{value}</p>
                <p className="text-stone-500 text-xs mt-0.5">{label}</p>
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
        <span className="text-stone-600 text-xs tracking-widest uppercase">Scroll</span>
        <motion.div
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" as const }}
          className="w-px h-10 bg-gradient-to-b from-stone-600 to-transparent"
        />
      </motion.div>
    </section>
  );
}

function HouseCard() {
  return (
    <div className="relative w-full max-w-md">
      <div className="relative bg-sage-900/60 border border-sage-700/40 rounded-2xl p-7 backdrop-blur-sm">
        <svg viewBox="0 0 360 280" className="w-full" fill="none" xmlns="http://www.w3.org/2000/svg">
          <line x1="30" y1="260" x2="330" y2="260" stroke="#344130" strokeWidth="1.5" strokeDasharray="4 6" />
          <rect x="55" y="145" width="250" height="115" rx="3" stroke="#506447" strokeWidth="1.5" />
          <polyline points="35,145 180,55 325,145" stroke="#819874" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
          <rect x="258" y="72" width="22" height="44" rx="2" stroke="#647c57" strokeWidth="1.5" />
          <rect x="255" y="69" width="28" height="6" rx="1" stroke="#647c57" strokeWidth="1.5" />
          <rect x="148" y="88" width="28" height="16" rx="1" stroke="#819874" strokeWidth="1.5" opacity="0.9" />
          <line x1="162" y1="88" x2="162" y2="104" stroke="#819874" strokeWidth="1" opacity="0.7" />
          <rect x="183" y="83" width="28" height="16" rx="1" stroke="#819874" strokeWidth="1.5" opacity="0.9" />
          <line x1="197" y1="83" x2="197" y2="99" stroke="#819874" strokeWidth="1" opacity="0.7" />
          <rect x="150" y="190" width="60" height="70" rx="4" stroke="#506447" strokeWidth="1.5" />
          <line x1="180" y1="190" x2="180" y2="260" stroke="#506447" strokeWidth="1" />
          <circle cx="202" cy="228" r="3.5" fill="#819874" />
          <rect x="80" y="175" width="48" height="38" rx="3" stroke="#506447" strokeWidth="1.5" />
          <line x1="104" y1="175" x2="104" y2="213" stroke="#506447" strokeWidth="1" />
          <line x1="80" y1="194" x2="128" y2="194" stroke="#506447" strokeWidth="1" />
          <rect x="232" y="175" width="48" height="38" rx="3" stroke="#506447" strokeWidth="1.5" />
          <line x1="256" y1="175" x2="256" y2="213" stroke="#506447" strokeWidth="1" />
          <line x1="232" y1="194" x2="280" y2="194" stroke="#506447" strokeWidth="1" />
          <line x1="55" y1="272" x2="305" y2="272" stroke="#344130" strokeWidth="1" />
          <line x1="55" y1="268" x2="55" y2="276" stroke="#344130" strokeWidth="1" />
          <line x1="305" y1="268" x2="305" y2="276" stroke="#344130" strokeWidth="1" />
          <text x="180" y="278" textAnchor="middle" fill="#647c57" fontSize="9" fontFamily="monospace">35 — 120 m²</text>
        </svg>

        <div className="mt-5 grid grid-cols-3 gap-3">
          {[
            { value: "60-90", unit: "días", label: "Entrega" },
            { value: "5", unit: "años", label: "Garantía" },
            { value: "100%", unit: "", label: "Nacional" },
          ].map(({ value, unit, label }) => (
            <div key={label} className="text-center bg-sage-950/60 rounded-lg py-2.5">
              <div className="text-white font-bold text-sm">
                {value}
                <span className="text-sage-400 text-xs ml-0.5">{unit}</span>
              </div>
              <div className="text-stone-500 text-[10px] mt-0.5">{label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="absolute -top-4 -right-4 bg-sage-600 text-white text-xs font-bold px-3.5 py-1.5 rounded-full shadow-lg shadow-sage-600/30">
        Desde USD 18.900
      </div>

      <div className="absolute -z-10 inset-0 bg-sage-800/20 rounded-2xl border border-sage-700/20 translate-x-3 translate-y-3" />
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

function WhatsAppIcon() {
  return (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}
