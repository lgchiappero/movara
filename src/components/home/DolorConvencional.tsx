"use client";

import { motion } from "framer-motion";

type Stat = { _key?: string; stat: string; label: string; sub: string };
type Problema = { _key?: string; titulo: string; descripcion: string };

type DolorContent = {
  titulo?: string;
  subtitulo?: string;
  stats?: Stat[];
  problemas?: Problema[];
  separador?: string;
};

const DEFAULT_PROBLEMAS: Problema[] = [
  {
    titulo: "Renegar con albañiles",
    descripcion:
      "Llegaron tres días, después desaparecieron. Volvieron a cobrar, avanzaron poco. El ciclo de siempre.",
  },
  {
    titulo: "Presupuestos que no cierran",
    descripcion:
      "Te dijeron $X. A mitad de obra ya iban $2X. Y todavía faltaba la mitad.",
  },
  {
    titulo: "Meses que se vuelven años",
    descripcion:
      "Lo que iba a estar en 6 meses lleva 2 años y todavía no tiene techo definitivo.",
  },
  {
    titulo: "Decisiones que te consumen",
    descripcion:
      "Cerámicos, ventanas, electricista, plomero, inspector. Coordinás vos. Todo. Todo el tiempo.",
  },
  {
    titulo: "Incertidumbre total",
    descripcion:
      "Nunca sabés cuánto va a salir en total. Ni cuándo va a terminar. Ni si va a quedar bien.",
  },
  {
    titulo: "El costo emocional",
    descripcion:
      "Años de ahorro en juego, decisiones todos los días, y una obra que te sigue en la cabeza 24/7.",
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

        {/* Problem cards grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-16">
          {problemas.map((p, i) => (
            <motion.div
              key={p._key ?? p.titulo}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45, delay: i * 0.07 }}
              className="bg-stone-50 border border-stone-100 rounded-2xl p-6 hover:border-stone-200 transition-colors"
            >
              <div className="w-7 h-7 rounded-full bg-red-50 border border-red-100 flex items-center justify-center mb-4 shrink-0">
                <span className="text-[11px] text-red-400 font-bold">✕</span>
              </div>
              <h3 className="font-bold text-[#2F2F2F] text-base mb-2 leading-snug">
                {p.titulo}
              </h3>
              <p className="text-stone-500 text-sm leading-relaxed">{p.descripcion}</p>
            </motion.div>
          ))}
        </div>

        {/* Separator */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="flex items-center gap-6"
        >
          <div className="flex-1 h-px bg-stone-100" />
          <p className="text-sm font-semibold text-[#2F2F2F] text-center shrink-0 px-2">
            {separador}
          </p>
          <div className="flex-1 h-px bg-stone-100" />
        </motion.div>
      </div>
    </section>
  );
}
