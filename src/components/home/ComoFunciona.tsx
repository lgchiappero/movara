"use client";

import { motion } from "framer-motion";
import Link from "next/link";

type Paso = { _key?: string; titulo: string; descripcion: string };

type ComoFuncionaContent = {
  titulo?: string;
  pasos?: Paso[];
};

const DEFAULT_PASOS: Paso[] = [
  {
    titulo: "Configurás tu espacio online",
    descripcion: "Elegís modelo, provincia y uso. El configurador recomienda el estándar térmico ideal para tu zona.",
  },
  {
    titulo: "Recibís tu presupuesto acorde a tus necesidades",
    descripcion: "Precio fijo, sin letra chica. Sin sorpresas.",
  },
  {
    titulo: "Fabricamos y coordinamos el envío",
    descripcion: "Producción en planta bajo controles de calidad. Logística hasta tu terreno incluida.",
  },
  {
    titulo: "Tu MOVARA llega lista para instalarse",
    descripcion: "Sin obra, sin escombros. Garantía escrita incluida desde el primer día.",
  },
];

export default function ComoFunciona({ content }: { content?: ComoFuncionaContent | null }) {
  const titulo = content?.titulo ?? "De la idea al espacio en 4 pasos";
  const pasos = content?.pasos?.length ? content.pasos : DEFAULT_PASOS;

  return (
    <section id="proceso" className="py-32 bg-white">
      <div className="max-w-5xl mx-auto px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-20"
        >
          <span className="text-xs font-semibold uppercase tracking-widest text-sage-500 mb-4 block">
            ¿Cómo tener tu MOVARA?
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-[#2F2F2F] leading-tight">
            {titulo}
          </h2>
        </motion.div>

        <div className="grid sm:grid-cols-2 gap-x-12 gap-y-16">
          {pasos.map((paso, i) => (
            <motion.div
              key={paso._key ?? paso.titulo}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="flex flex-col"
            >
              <span className="text-7xl font-bold text-sage-500 leading-none mb-6 select-none">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="font-bold text-[#2F2F2F] text-xl mb-3 leading-snug">{paso.titulo}</h3>
              <p className="text-stone-500 text-base leading-relaxed">{paso.descripcion}</p>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="text-center mt-20"
        >
          <Link
            href="/configurador"
            className="inline-flex items-center gap-2 px-8 py-4 bg-sage-500 hover:bg-sage-600 text-white font-semibold rounded-xl transition-all duration-200 hover:shadow-xl hover:shadow-sage-500/25 hover:-translate-y-0.5"
          >
            Empezar ahora
            <ArrowRightIcon />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}

function ArrowRightIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}
