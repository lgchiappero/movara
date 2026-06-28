"use client";

import { motion } from "framer-motion";
import {
  Shield,
  Layers,
  Wind,
  Droplets,
  Thermometer,
  ClipboardCheck,
  type LucideIcon,
} from "lucide-react";

type BadgeItem = {
  _key?: string;
  iconoLucide?: string;
  titulo: string;
  descripcion?: string;
  badge?: string;
};

type PruebaSocialContent = {
  badgeSeccion?: string;
  titulo?: string;
  subtitulo?: string;
  badges?: BadgeItem[];
  textoCierre?: string;
  showroomTitulo?: string;
  showroomDesc?: string;
  showroomChip?: string;
};

const LUCIDE_MAP: Record<string, LucideIcon> = {
  Shield,
  Layers,
  Wind,
  Droplets,
  Thermometer,
  ClipboardCheck,
};

const DEFAULT_BADGES: BadgeItem[] = [
  {
    iconoLucide: "Shield",
    titulo: "Certificación CE",
    descripcion:
      "Certificación europea de conformidad. El estándar más exigente del mundo para construcción modular.",
    badge: "CE Certified",
  },
  {
    iconoLucide: "Layers",
    titulo: "Estructura Steel Q235B",
    descripcion:
      "Acero estructural de grado industrial. La misma especificación usada en construcción civil y minería de escala.",
    badge: "Grado Industrial",
  },
  {
    iconoLucide: "Wind",
    titulo: "Resistencia al viento certificada",
    descripcion:
      "Diseñado y testeado para resistir vientos de hasta 120 km/h. Certificación estructural incluida.",
    badge: "Wind Rated",
  },
  {
    iconoLucide: "Droplets",
    titulo: "Impermeabilización total",
    descripcion:
      "Sistema de sellado perimetral hermético. Certificación waterproof contra lluvia, humedad y condensación.",
    badge: "Waterproof Certified",
  },
  {
    iconoLucide: "Thermometer",
    titulo: "Aislación lana de roca 75mm",
    descripcion:
      "Valor R 2.1 m²K/W. Aislación térmica y acústica superior al estándar residencial argentino. Incombustible.",
    badge: "R-Value 2.1",
  },
  {
    iconoLucide: "ClipboardCheck",
    titulo: "Control de calidad de fábrica",
    descripcion:
      "Cada unidad pasa por inspección de calidad antes de salir de fábrica. Documentación técnica completa incluida.",
    badge: "QC Verified",
  },
];

export default function PruebaSocial({ content }: { content?: PruebaSocialContent | null }) {
  const badgeSeccion = content?.badgeSeccion ?? "Estándares internacionales";
  const titulo = content?.titulo ?? "Calidad que no se negocia";
  const subtitulo =
    content?.subtitulo ??
    "Cada MOVARA sale de fábrica con certificaciones internacionales y procesos industrializados de precisión. No es una obra. Es manufactura controlada.";
  const badges = content?.badges?.length ? content.badges : DEFAULT_BADGES;
  const textoCierre =
    content?.textoCierre ??
    "No comprás una promesa. Comprás un producto que ya fue testeado, certificado y aprobado antes de llegar a tu terreno.";
  const showroomTitulo = content?.showroomTitulo ?? "Showroom próximamente en Sunchales, Santa Fe";
  const showroomDesc =
    content?.showroomDesc ??
    "Vas a poder recorrer un modelo real, tocar los materiales y hablar con nuestro equipo.";
  const showroomChip = content?.showroomChip ?? "Próximamente";

  return (
    <section className="py-24 bg-[#1A1A1A]">
      <div className="max-w-5xl mx-auto px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="text-xs font-semibold uppercase tracking-widest text-[#D4B06A] mb-4 block">
            {badgeSeccion}
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-5">{titulo}</h2>
          <p className="text-stone-300 text-lg font-medium max-w-2xl mx-auto leading-relaxed">{subtitulo}</p>
        </motion.div>

        {/* Quality cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-14">
          {badges.map((b, i) => {
            const Icon = b.iconoLucide ? (LUCIDE_MAP[b.iconoLucide] ?? Shield) : Shield;

            return (
              <motion.div
                key={b._key ?? b.titulo}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45, delay: i * 0.07 }}
                className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-[#D4B06A]/30 hover:bg-white/[0.07] transition-all duration-200"
              >
                {/* Icon + badge row */}
                <div className="flex items-start justify-between mb-5">
                  <Icon size={36} className="text-[#D4B06A]" strokeWidth={1.5} />
                  {b.badge && (
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#D4B06A] bg-[#D4B06A]/10 border border-[#D4B06A]/20 px-2.5 py-1 rounded-full whitespace-nowrap">
                      {b.badge}
                    </span>
                  )}
                </div>

                <h3 className="font-bold text-white text-sm mb-2 leading-snug">{b.titulo}</h3>
                {b.descripcion && (
                  <p className="text-stone-300 text-sm font-medium leading-relaxed">{b.descripcion}</p>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Closing text */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-14"
        >
          <div className="inline-block border border-[#D4B06A]/20 rounded-2xl px-8 py-5 bg-[#D4B06A]/5">
            <p className="text-stone-200 text-base font-medium leading-relaxed max-w-2xl">
              {textoCierre}
            </p>
          </div>
        </motion.div>

        {/* Showroom section */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="bg-white/5 border border-[#D4B06A]/20 rounded-3xl overflow-hidden"
        >
          {/* Header */}
          <div className="p-8 pb-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#D4B06A]/10 border border-[#D4B06A]/30 text-[#D4B06A] text-xs font-bold uppercase tracking-widest animate-pulse">
                🔨 En construcción — Próximamente
              </span>
            </div>
            <h3 className="text-white text-2xl font-bold mb-2">{showroomTitulo}</h3>
            <p className="text-stone-300 text-base font-medium leading-relaxed mb-1">
              Nuestro primer showroom está en camino. Vas a poder ver, tocar y recorrer una unidad MOVARA real.
            </p>
            <div className="flex items-center gap-2 mt-3 text-stone-400 text-sm">
              <span>📍</span>
              <span>Sunchales, Santa Fe, Argentina</span>
            </div>
          </div>

          {/* Map */}
          <a
            href="https://www.google.com/maps/search/Sunchales,+Santa+Fe,+Argentina"
            target="_blank"
            rel="noopener noreferrer"
            className="block relative group"
            aria-label="Ver Sunchales en Google Maps"
          >
            <iframe
              src="https://maps.google.com/maps?q=-31.5333,-61.5667&z=13&output=embed"
              width="100%"
              height="260"
              style={{ border: 0, display: "block" }}
              loading="lazy"
              allowFullScreen
              referrerPolicy="no-referrer-when-downgrade"
              title="Showroom MOVARA — Sunchales, Santa Fe"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-200 flex items-center justify-center pointer-events-none">
              <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/70 text-white text-xs px-3 py-1.5 rounded-full">
                Abrir en Google Maps
              </span>
            </div>
          </a>

          {/* Footer */}
          <div className="p-6 pt-5 border-t border-white/10">
            <p className="text-stone-400 text-sm leading-relaxed">
              La dirección exacta se confirmará próximamente.{" "}
              <span className="text-[#D4B06A] font-medium">Registrate para recibir la invitación al evento de apertura.</span>
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
