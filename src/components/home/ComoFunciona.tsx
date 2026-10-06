"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import Reveal from "@/components/motion/Reveal";
import CountUp from "@/components/motion/CountUp";

type Paso = { _key?: string; titulo: string; descripcion: string };

type ComoFuncionaContent = {
  titulo?: string;
  pasos?: Paso[];
};

const DEFAULT_PASOS: Paso[] = [
  {
    titulo: "Configurás tu espacio",
    descripcion: "Elegís modelo, provincia y uso. El configurador recomienda el estándar térmico para tu zona.",
  },
  {
    titulo: "Recibís tu presupuesto",
    descripcion: "Precio fijo, acorde a tus necesidades. Sin letra chica ni sorpresas.",
  },
  {
    titulo: "Fabricamos y coordinamos",
    descripcion: "Producción en planta con controles de calidad. Logística hasta tu terreno incluida.",
  },
  {
    titulo: "Llega listo",
    descripcion: "Sin obra ni escombros. Garantía escrita desde el primer día.",
  },
];

/** Cifras con conteo animado al entrar al viewport. */
export const STATS = [
  { valor: 90, unidad: "días", label: "Plazo máximo de entrega" },
  { valor: 12, unidad: "meses", label: "De garantía MOVARA" },
  { valor: 3, unidad: "tamaños", label: "De módulo para elegir" },
];

export default function ComoFunciona({ content }: { content?: ComoFuncionaContent | null }) {
  const titulo = content?.titulo ?? "De la idea al espacio en 4 pasos";
  const pasos = content?.pasos?.length ? content.pasos : DEFAULT_PASOS;

  return (
    <section id="proceso" className="py-32 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal className="text-center mb-20">
          <span className="text-xs font-semibold uppercase tracking-widest text-[#D4B06A] mb-4 block">
            ¿Cómo tener tu MOVARA?
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-[#2F2F2F] leading-tight">{titulo}</h2>
        </Reveal>

        <ol className="relative grid gap-12 lg:grid-cols-4 lg:gap-8">
          {/* Línea conectora — desktop: horizontal a la altura de los íconos,
              de centro a centro del primer y último paso. Se "dibuja" al
              entrar al viewport (con reduced motion aparece completa). */}
          <motion.div
            aria-hidden
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1.2, ease: "easeInOut" }}
            className="hidden lg:block absolute top-8 left-[12.5%] right-[12.5%] h-px bg-[#D4B06A]/40 origin-left"
          />
          {pasos.map((paso, i) => {
            const Icono = ICONOS[i % ICONOS.length];
            return (
              <li key={paso._key ?? paso.titulo} className="relative">
                {/* Mobile: tramo vertical desde este ícono hasta el siguiente
                    (el último no lleva, así la línea termina en el ícono 04). */}
                {i < pasos.length - 1 && (
                  <motion.div
                    aria-hidden
                    initial={{ scaleY: 0 }}
                    whileInView={{ scaleY: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: 0.2 + i * 0.12, ease: "easeInOut" }}
                    className="lg:hidden absolute left-8 top-16 -bottom-12 w-px bg-[#D4B06A]/40 origin-top"
                  />
                )}
                <Reveal delay={i * 0.12} className="flex gap-6 lg:flex-col lg:items-center lg:text-center lg:gap-0">
                  <div className="relative z-10 shrink-0 w-16 h-16 rounded-full bg-white border border-[#D4B06A]/50 flex items-center justify-center text-[#2F2F2F]">
                    <Icono />
                  </div>
                  <div className="lg:mt-6">
                    <span className="block text-5xl lg:text-6xl font-bold text-[#D4B06A] leading-none mb-3 select-none">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <h3 className="font-bold text-[#2F2F2F] text-lg mb-2 leading-snug">{paso.titulo}</h3>
                    <p className="text-stone-500 text-sm leading-relaxed lg:max-w-[16rem] lg:mx-auto">
                      {paso.descripcion}
                    </p>
                  </div>
                </Reveal>
              </li>
            );
          })}
        </ol>

        {/* Cifras clave con conteo animado */}
        <Reveal className="mt-24 grid grid-cols-3 divide-x divide-stone-200 border-y border-stone-200 py-10">
          {STATS.map((s) => (
            <div key={s.unidad} className="px-2 text-center">
              <p className="text-[#2F2F2F] font-bold leading-none">
                <CountUp to={s.valor} className="text-4xl sm:text-6xl tabular-nums" />
                <span className="ml-1.5 text-sm sm:text-lg font-semibold text-[#D4B06A]">{s.unidad}</span>
              </p>
              <p className="mt-3 text-xs sm:text-sm text-stone-500">{s.label}</p>
            </div>
          ))}
        </Reveal>

        <Reveal delay={0.1} className="text-center mt-16">
          <Link
            href="/configurador"
            className="inline-flex items-center gap-2 px-8 py-4 bg-sage-500 hover:bg-sage-600 text-white font-semibold rounded-xl transition-all duration-200 hover:shadow-xl hover:shadow-sage-500/25 hover:-translate-y-0.5"
          >
            Empezar ahora
            <ArrowRightIcon />
          </Link>
        </Reveal>
      </div>
    </section>
  );
}

/* Íconos de línea fina (stroke 1.25) — mismo grid de 32px para los 4. */

const iconProps = {
  width: 30,
  height: 30,
  viewBox: "0 0 32 32",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.25,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

/** Configurás: plano de planta con un cursor de selección. */
function IconoConfigurar() {
  return (
    <svg {...iconProps}>
      <rect x="4" y="6" width="24" height="18" rx="1.5" />
      <path d="M4 15h10M14 6v18M20 15h8" />
      <path d="M21 20l5 2-2 1-1 2z" />
    </svg>
  );
}

/** Presupuesto: documento con renglones y total destacado. */
function IconoPresupuesto() {
  return (
    <svg {...iconProps}>
      <path d="M9 4h10l5 5v19H9z" />
      <path d="M19 4v5h5" />
      <path d="M12 14h9M12 18h9M12 23h4" />
      <path d="M19 22.5l1.5 1.5 3-3" />
    </svg>
  );
}

/** Fabricamos: planta industrial con techo en diente de sierra. */
function IconoFabricar() {
  return (
    <svg {...iconProps}>
      <path d="M4 27V14l6 4v-4l6 4v-4l6 4V6h5v21z" />
      <path d="M4 27h24" />
      <path d="M9 23h3M15 23h3M21 23h3" />
    </svg>
  );
}

/** Llega listo: módulo con techo y check. */
function IconoListo() {
  return (
    <svg {...iconProps}>
      <path d="M4 14L16 5l12 9" />
      <path d="M7 12v15h18V12" />
      <path d="M12 19l3 3 5-6" />
    </svg>
  );
}

const ICONOS = [IconoConfigurar, IconoPresupuesto, IconoFabricar, IconoListo];

function ArrowRightIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}
