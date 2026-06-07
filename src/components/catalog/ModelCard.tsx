"use client";

import Link from "next/link";
import { CATEGORY_LABELS, type ProductModel } from "@/data/models";
import { useWizardStore } from "@/store/wizard";

type Props = { model: ProductModel };

const CATEGORY_GRADIENT: Record<string, { gradient: string; accent: string }> = {
  familiar:  { gradient: "from-sage-900/80 via-sage-800/60 to-sage-700/40", accent: "#647c57" },
  turistico: { gradient: "from-sage-950/90 via-sage-900/70 to-sage-800/50", accent: "#819874" },
  oficina:   { gradient: "from-stone-800/90 via-stone-700/70 to-stone-600/50", accent: "#a5b899" },
};
const FALLBACK = { gradient: "from-sage-900 to-sage-950", accent: "#819874" };

export default function ModelCard({ model }: Props) {
  const openWizard = useWizardStore((s) => s.openWizard);
  const img = model.images?.[0] ?? null;
  const { gradient, accent } = img?.gradient
    ? { gradient: img.gradient, accent: img.accent }
    : (CATEGORY_GRADIENT[model.category] ?? FALLBACK);

  return (
    <article className="group flex flex-col bg-white border border-stone-100 rounded-2xl overflow-hidden hover:shadow-2xl hover:shadow-stone-900/10 hover:border-stone-200 transition-all duration-300 hover:-translate-y-1">
      {/* Image */}
      <div className={`relative h-52 bg-gradient-to-br ${gradient} overflow-hidden`}>
        <HouseIllustration accent={accent} />

        {/* Badges */}
        <div className="absolute top-3 left-3 right-3 flex items-start justify-between gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-widest px-2.5 py-1 rounded-full bg-black/30 text-white/80 backdrop-blur-sm">
            {CATEGORY_LABELS[model.category]}
          </span>
          {model.tag && (
            <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full bg-sage-500 text-white shadow-md">
              {model.tag}
            </span>
          )}
        </div>

        {/* Size overlay */}
        <div className="absolute bottom-3 right-3 font-mono text-white/60 text-sm font-semibold">
          {model.size} m²
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 p-6">
        <h3 className="text-xl font-bold text-stone-900 group-hover:text-sage-700 transition-colors">
          {model.name}
        </h3>
        <p className="text-stone-500 text-sm mt-1 leading-snug">{model.tagline}</p>

        {/* Quick specs */}
        <div className="flex items-center gap-4 mt-4 text-xs text-stone-400">
          <span className="flex items-center gap-1.5">
            <GridIcon className="w-3.5 h-3.5" />
            {model.size} m²
          </span>
          <span className="flex items-center gap-1.5">
            <BedIcon className="w-3.5 h-3.5" />
            {model.rooms === 1 ? "1 ambiente" : `${model.rooms} amb.`}
          </span>
          <span className="flex items-center gap-1.5">
            <BathIcon className="w-3.5 h-3.5" />
            {model.baths === 1 ? "1 baño" : `${model.baths} baños`}
          </span>
        </div>

        {/* Price */}
        <div className="mt-5 pt-5 border-t border-stone-100 flex items-end justify-between">
          <div>
            <p className="text-[10px] font-medium text-stone-400 uppercase tracking-wider leading-none">
              Desde
            </p>
            <p className="text-2xl font-bold text-stone-900 mt-1 leading-none">
              {model.priceUSD != null ? `USD ${model.priceUSD.toLocaleString("es-AR")}` : "Consultar precio"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/modelos/${model.slug}`}
              className="px-4 py-2 border border-stone-200 hover:border-stone-300 text-stone-600 hover:text-stone-900 text-sm font-semibold rounded-xl transition-colors"
            >
              Ver detalles
            </Link>
            <button
              onClick={() => openWizard({ slug: model.slug, name: model.name, category: model.category })}
              className="px-4 py-2 bg-sage-600 hover:bg-sage-700 text-white text-sm font-semibold rounded-xl transition-colors"
            >
              Me interesa
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

function HouseIllustration({ accent }: { accent: string }) {
  return (
    <svg
      viewBox="0 0 320 240"
      className="absolute inset-0 w-full h-full opacity-25"
      fill="none"
    >
      <polyline
        points="20,130 160,40 300,130"
        stroke={accent}
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <rect x="40" y="130" width="240" height="90" rx="2" stroke={accent} strokeWidth="1.5" />
      <rect x="125" y="165" width="70" height="55" rx="3" stroke={accent} strokeWidth="1.5" />
      <circle cx="188" cy="195" r="4" fill={accent} opacity="0.8" />
      <rect x="55" y="150" width="44" height="34" rx="2" stroke={accent} strokeWidth="1.5" />
      <line x1="77" y1="150" x2="77" y2="184" stroke={accent} strokeWidth="1" />
      <line x1="55" y1="167" x2="99" y2="167" stroke={accent} strokeWidth="1" />
      <rect x="221" y="150" width="44" height="34" rx="2" stroke={accent} strokeWidth="1.5" />
      <line x1="243" y1="150" x2="243" y2="184" stroke={accent} strokeWidth="1" />
      <line x1="221" y1="167" x2="265" y2="167" stroke={accent} strokeWidth="1" />
      <rect x="248" y="68" width="18" height="36" rx="1" stroke={accent} strokeWidth="1.5" />
      <rect x="140" y="72" width="22" height="14" rx="1" stroke={accent} strokeWidth="1.5" opacity="0.7" />
      <rect x="168" y="68" width="22" height="14" rx="1" stroke={accent} strokeWidth="1.5" opacity="0.7" />
    </svg>
  );
}

function GridIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
    </svg>
  );
}

function BedIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12v-2a5 5 0 015-5h8a5 5 0 015 5v2M3 12v5h18v-5M3 12h18" />
    </svg>
  );
}

function BathIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 12h16M4 12a2 2 0 01-2-2V6a2 2 0 012-2h3.5M4 12v5a2 2 0 002 2h12a2 2 0 002-2v-5" />
    </svg>
  );
}
