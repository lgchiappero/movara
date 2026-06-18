"use client";

import Link from "next/link";
import { useWizardStore } from "@/store/wizard";

type FeaturedModelsData = {
  title?: string | null;
  subtitle?: string | null;
};

const MODELS = [
  {
    slug: "familiar-65",
    name: "Familiar 65",
    tag: "Más elegido",
    tagColor: "bg-sage-100 text-sage-700",
    size: 65,
    rooms: 3,
    baths: 2,
    price: "34.500",
    description:
      "La opción más popular para familias. Tres ambientes funcionales, cocina integrada y dos baños completos.",
    gradient: "from-sage-900/80 via-sage-800/60 to-sage-700/40",
    accent: "#647c57",
    maxHabitaciones: 3,
    permiteCocinaSiMax3Hab: false,
  },
  {
    slug: "studio-35",
    name: "Studio 35",
    tag: "Ideal inversión",
    tagColor: "bg-stone-900 text-sage-400",
    size: 35,
    rooms: 1,
    baths: 1,
    price: "18.900",
    description:
      "Ideal para inversión turística o como espacio independiente. Diseño inteligente que maximiza cada metro cuadrado.",
    gradient: "from-sage-950/90 via-sage-900/70 to-sage-800/50",
    accent: "#819874",
    maxHabitaciones: 1,
    permiteCocinaSiMax3Hab: false,
  },
  {
    slug: "premium-95",
    name: "Premium 95",
    tag: "Premium",
    tagColor: "bg-stone-800 text-stone-200",
    size: 95,
    rooms: 4,
    baths: 2,
    price: "52.000",
    description:
      "El máximo en confort y diseño. Cuatro ambientes, terminaciones de primera y posibilidad de ampliación.",
    gradient: "from-stone-800/90 via-stone-700/70 to-stone-600/50",
    accent: "#a5b899",
    maxHabitaciones: 4,
    permiteCocinaSiMax3Hab: true,
  },
];

export default function FeaturedModels({ data }: { data?: FeaturedModelsData | null }) {
  const openWizard = useWizardStore((s) => s.openWizard);
  const title = data?.title ?? 'Modelos más elegidos';
  const subtitle = data?.subtitle;

  return (
    <section id="modelos" className="bg-white py-24">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-14">
          <div>
            <span className="text-sage-600 text-sm font-semibold uppercase tracking-widest">
              Catálogo
            </span>
            <h2 className="mt-3 text-4xl font-bold text-stone-900 tracking-tight">
              {title}
            </h2>
            {subtitle && (
              <p className="mt-2 text-stone-500 text-base max-w-xl leading-relaxed">{subtitle}</p>
            )}
          </div>
          <Link
            href="/modelos"
            className="shrink-0 text-sm font-semibold text-stone-500 hover:text-sage-600 transition-colors"
          >
            Ver catálogo completo →
          </Link>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {MODELS.map((model) => (
            <article
              key={model.slug}
              className="group bg-white border border-stone-100 rounded-2xl overflow-hidden hover:shadow-2xl hover:shadow-stone-900/10 transition-all duration-300 hover:-translate-y-1"
            >
              {/* Image placeholder with gradient + SVG */}
              <div className={`relative h-52 bg-gradient-to-br ${model.gradient} flex items-end p-5`}>
                <HouseOutline accent={model.accent} />
                <span className={`relative z-10 text-xs font-semibold px-2.5 py-1 rounded-full ${model.tagColor}`}>
                  {model.tag}
                </span>
              </div>

              <div className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-bold text-stone-900">{model.name}</h3>
                    <p className="text-stone-400 text-sm mt-0.5">{model.size} m² totales</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-stone-400 leading-none">Desde</p>
                    <p className="text-xl font-bold text-stone-900 mt-0.5">USD {model.price}</p>
                  </div>
                </div>

                <p className="mt-4 text-sm text-stone-500 leading-relaxed">{model.description}</p>

                <div className="mt-5 flex items-center gap-4 text-xs text-stone-400">
                  <span className="flex items-center gap-1.5">
                    <BedIcon className="w-3.5 h-3.5" />
                    {model.rooms} {model.rooms === 1 ? "ambiente" : "ambientes"}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <BathIcon className="w-3.5 h-3.5" />
                    {model.baths} {model.baths === 1 ? "baño" : "baños"}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <RulerIcon className="w-3.5 h-3.5" />
                    {model.size} m²
                  </span>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-3">
                  <button
                    onClick={() => openWizard({ slug: model.slug, name: model.name, maxHabitaciones: model.maxHabitaciones, permiteCocinaSiMax3Hab: model.permiteCocinaSiMax3Hab })}
                    className="px-4 py-2.5 bg-sage-600 hover:bg-sage-500 text-white text-sm font-semibold rounded-xl transition-colors text-center"
                  >
                    Me interesa
                  </button>
                  <Link
                    href={`/modelos/${model.slug}`}
                    className="text-center px-4 py-2.5 border border-stone-200 hover:border-sage-300 text-stone-600 hover:text-stone-900 text-sm font-semibold rounded-xl transition-colors"
                  >
                    Ver detalles
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function HouseOutline({ accent }: { accent: string }) {
  return (
    <svg viewBox="0 0 200 150" className="absolute inset-0 w-full h-full opacity-25" fill="none">
      <polyline points="10,90 100,20 190,90" stroke={accent} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      <rect x="30" y="90" width="140" height="50" rx="2" stroke={accent} strokeWidth="1.5" />
      <rect x="80" y="105" width="40" height="35" rx="2" stroke={accent} strokeWidth="1.5" />
      <rect x="45" y="100" width="24" height="20" rx="2" stroke={accent} strokeWidth="1.5" />
      <rect x="131" y="100" width="24" height="20" rx="2" stroke={accent} strokeWidth="1.5" />
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

function RulerIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 7h18M3 12h4m6 0h4M3 17h18" />
    </svg>
  );
}
