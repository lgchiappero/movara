"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { getWhatsAppUrl } from "@/lib/whatsapp";

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.7, delay, ease: "easeOut" as const },
});

export default function Hero({ waNumber }: { waNumber?: string | null }) {
  const waUrl = getWhatsAppUrl("Hola MOVARA! Quiero más información sobre sus espacios modulares.", waNumber);

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden bg-white">
      {/* Dot grid */}
      <div
        className="absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage: "radial-gradient(circle, #2F2F2F 1px, transparent 1px)",
          backgroundSize: "44px 44px",
        }}
      />
      <div className="absolute top-0 right-0 w-[560px] h-[560px] bg-sage-100 rounded-full blur-[120px] opacity-60 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-sage-50 rounded-full blur-[100px] opacity-80 pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-6 lg:px-8 py-28 lg:py-24 grid lg:grid-cols-2 gap-12 lg:gap-20 items-center w-full">
        {/* Copy */}
        <div>
          <motion.div {...fadeUp(0.05)}>
            <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-sage-100 border border-sage-200 text-sage-700 text-xs font-medium mb-7 tracking-wide">
              <span className="w-1.5 h-1.5 rounded-full bg-sage-500 animate-pulse" />
              Estructura steel Q235B · Lana de roca 75mm · DVH incluido
            </span>
          </motion.div>

          <motion.h1
            {...fadeUp(0.12)}
            className="text-[2.6rem] sm:text-[3.5rem] lg:text-[4.25rem] font-bold text-[#2F2F2F] leading-[1.07] tracking-tight"
          >
            Tu espacio listo{" "}
            <span className="text-sage-500">en semanas,</span>{" "}
            no en años.
          </motion.h1>

          <motion.p
            {...fadeUp(0.2)}
            className="mt-6 text-lg text-stone-500 leading-relaxed max-w-lg"
          >
            Casas modulares de acero de alta calidad, adaptadas a tu clima y tu necesidad.
            Sin obra. Sin demoras. Sin sorpresas.
          </motion.p>

          <motion.div {...fadeUp(0.28)} className="mt-10 flex flex-wrap gap-4">
            <Link
              href="/configurador"
              className="inline-flex items-center gap-2 px-7 py-3.5 bg-sage-500 hover:bg-sage-600 text-white font-semibold rounded-xl transition-all duration-200 hover:shadow-xl hover:shadow-sage-500/25 hover:-translate-y-0.5 text-sm"
            >
              Diseñá tu MOVARA
              <ArrowRightIcon />
            </Link>
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-7 py-3.5 border-2 border-stone-200 hover:border-green-400 text-stone-700 hover:text-green-700 font-semibold rounded-xl transition-all duration-200 text-sm bg-white hover:bg-green-50"
            >
              <WhatsAppIcon className="w-4 h-4" />
              Hablá con nosotros
            </a>
          </motion.div>

          <motion.div {...fadeUp(0.38)} className="mt-12 flex flex-wrap gap-8">
            {[
              { value: "4–8", unit: "semanas", label: "Plazo de entrega" },
              { value: "Precio", unit: "fijo", label: "Sin sorpresas" },
              { value: "Garantía", unit: "escrita", label: "Respaldo real" },
            ].map(({ value, unit, label }) => (
              <div key={label}>
                <p className="text-xl font-bold text-sage-500">
                  {value} <span className="text-sm font-semibold text-sage-400">{unit}</span>
                </p>
                <p className="text-stone-400 text-xs mt-0.5">{label}</p>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Visual card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.15, ease: "easeOut" as const }}
          className="hidden lg:flex items-center justify-center"
        >
          <HeroCard />
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

function HeroCard() {
  const specs = [
    { icon: "🏗️", label: "Steel Q235B", sub: "Estructura certificada CE" },
    { icon: "🌡️", label: "Lana de roca 75mm", sub: "Aislación térmica real" },
    { icon: "🪟", label: "DVH con RPT", sub: "Doble vidriado hermético" },
    { icon: "⚡", label: "Llave en mano", sub: "Sin obra en tu terreno" },
  ];

  return (
    <div className="relative w-full max-w-md">
      <div className="relative bg-white border border-sage-200 rounded-2xl p-7 shadow-2xl shadow-sage-900/8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-sage-500 flex items-center justify-center">
            <span className="text-white text-lg">🏠</span>
          </div>
          <div>
            <p className="font-bold text-[#2F2F2F] text-sm">MOVARA</p>
            <p className="text-xs text-stone-400">Espacios Modulares</p>
          </div>
          <div className="ml-auto px-2.5 py-1 bg-sage-100 rounded-full text-sage-700 text-xs font-semibold">
            Disponible
          </div>
        </div>

        <div className="space-y-3">
          {specs.map(({ icon, label, sub }) => (
            <div key={label} className="flex items-center gap-3 p-3 bg-stone-50 rounded-xl">
              <span className="text-xl shrink-0">{icon}</span>
              <div>
                <p className="text-sm font-semibold text-[#2F2F2F]">{label}</p>
                <p className="text-xs text-stone-400">{sub}</p>
              </div>
              <CheckIcon className="w-4 h-4 text-sage-500 ml-auto shrink-0" />
            </div>
          ))}
        </div>

        <div className="mt-5 p-4 bg-[#2F2F2F] rounded-xl text-center">
          <p className="text-xs text-stone-400 mb-1">Precio estimado desde</p>
          <p className="text-white font-bold text-2xl">USD 15.000</p>
          <p className="text-stone-500 text-xs mt-1">Incluye transporte e instalación</p>
        </div>
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

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}
