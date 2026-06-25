"use client";

import { motion } from "framer-motion";
import {
  HardHat,
  TrendingUp,
  Clock,
  Brain,
  HelpCircle,
  Frown,
  ChevronDown,
} from "lucide-react";

type Stat = { _key?: string; stat: string; label: string; sub: string };
type Problema = {
  _key?: string;
  icono?: string;
  titulo: string;
  descripcion: string;
  lineaImpacto?: string;
};

type DolorContent = {
  titulo?: string;
  subtitulo?: string;
  stats?: Stat[];
  problemas?: Problema[];
  separador?: string;
};

const LUCIDE_ICONS = [HardHat, TrendingUp, Clock, Brain, HelpCircle, Frown];
const ICON_COLORS = [
  "text-amber-500",
  "text-red-500",
  "text-orange-500",
  "text-amber-500",
  "text-red-500",
  "text-orange-500",
];

const DEFAULT_PROBLEMAS: Problema[] = [
  {
    icono: "👷",
    titulo: "Renegar con albañiles",
    descripcion:
      "Llegaron tres días, después desaparecieron. Volvieron a cobrar, avanzaron poco. El ciclo de siempre.",
    lineaImpacto: "Tiempo perdido que no volvés a recuperar",
  },
  {
    icono: "💸",
    titulo: "Presupuestos que no cierran",
    descripcion:
      "Te dijeron $X. A mitad de obra ya iban $2X. Y todavía faltaba la mitad.",
    lineaImpacto: "El sobrecosto promedio en Argentina es del 40-60% sobre el presupuesto original",
  },
  {
    icono: "⏳",
    titulo: "Meses que se vuelven años",
    descripcion:
      "Lo que iba a estar en 6 meses lleva 2 años y todavía no tiene techo definitivo.",
    lineaImpacto: "Una obra de 8 meses tarda en promedio 2.3 años en Argentina",
  },
  {
    icono: "🧠",
    titulo: "Decisiones que te consumen",
    descripcion:
      "Cerámicos, ventanas, electricista, plomero, inspector. Coordinás vos. Todo. Todo el tiempo.",
    lineaImpacto: "Más de 200 decisiones técnicas que tenés que tomar sin ser experto",
  },
  {
    icono: "❓",
    titulo: "Incertidumbre total",
    descripcion:
      "Nunca sabés cuánto va a salir en total. Ni cuándo va a terminar. Ni si va a quedar bien.",
    lineaImpacto: "Sin precio final, sin fecha, sin garantía de resultado",
  },
  {
    icono: "😤",
    titulo: "El costo emocional",
    descripcion:
      "Años de ahorro en juego, decisiones todos los días, y una obra que te sigue en la cabeza 24/7.",
    lineaImpacto: "El 73% de los que construyeron dicen que no lo volverían a hacer igual",
  },
];

export default function DolorConvencional({ content }: { content?: DolorContent | null }) {
  const titulo = content?.titulo ?? "¿Ya pasaste por esto?";
  const subtitulo =
    content?.subtitulo ??
    "La construcción tradicional en Argentina es un camino lleno de obstáculos que nadie te cuenta antes de empezar.";
  const problemas = content?.problemas?.length ? content.problemas : DEFAULT_PROBLEMAS;
  const separador =
    content?.separador ?? "MOVARA existe para que esto no te pase a vos.";

  const scrollToCategoria = () => {
    document.querySelector("#nueva-categoria")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="py-32 bg-white">
      <div className="max-w-5xl mx-auto px-6 lg:px-8">
        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-16"
        >
          <span className="text-xs font-semibold uppercase tracking-widest text-stone-400 mb-5 block">
            El problema
          </span>
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-[#2F2F2F] leading-[1.08] max-w-3xl mb-6">
            {titulo}
          </h2>
          <p className="text-lg text-stone-500 max-w-2xl leading-relaxed">
            {subtitulo}
          </p>
        </motion.div>

        {/* Problem cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-16">
          {problemas.map((p, i) => {
            const LucideIcon = LUCIDE_ICONS[i % LUCIDE_ICONS.length];
            const iconColor = ICON_COLORS[i % ICON_COLORS.length];
            const useEmoji = p.icono && /\p{Emoji}/u.test(p.icono);

            return (
              <motion.div
                key={p._key ?? p.titulo}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45, delay: i * 0.07 }}
                className="bg-stone-50 border border-stone-100 rounded-2xl p-6 flex flex-col hover:border-stone-200 hover:shadow-sm transition-all duration-200"
              >
                {/* Icon */}
                <div className="mb-5">
                  {useEmoji ? (
                    <span className="text-4xl leading-none">{p.icono}</span>
                  ) : (
                    <LucideIcon size={40} className={iconColor} strokeWidth={1.5} />
                  )}
                </div>

                {/* Title */}
                <h3 className="font-bold text-[#2F2F2F] text-base mb-2 leading-snug">
                  {p.titulo}
                </h3>

                {/* Description */}
                <p className="text-stone-500 text-sm leading-relaxed flex-1">
                  {p.descripcion}
                </p>

                {/* Impact line */}
                {p.lineaImpacto && (
                  <div className="mt-4 pt-4 border-t border-stone-200">
                    <p className="text-xs font-semibold text-red-500 leading-snug">
                      ↳ {p.lineaImpacto}
                    </p>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Separator */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="flex items-center gap-6 mb-10"
        >
          <div className="flex-1 h-px bg-stone-100" />
          <p className="text-sm font-semibold text-[#2F2F2F] text-center shrink-0 px-2">
            {separador}
          </p>
          <div className="flex-1 h-px bg-stone-100" />
        </motion.div>

        {/* Scroll CTA */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="flex flex-col items-center gap-3"
        >
          <button
            onClick={scrollToCategoria}
            className="inline-flex items-center gap-2 text-[#D4B06A] font-semibold text-sm hover:text-[#BF9A52] transition-colors"
          >
            Así lo resolvemos
            <span className="text-xs">→</span>
          </button>
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          >
            <ChevronDown size={20} className="text-stone-300" />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
