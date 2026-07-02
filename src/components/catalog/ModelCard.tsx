"use client";

import Link from "next/link";
import Image from "next/image";
import { type ProductModel, type ModelImage } from "@/data/models";
import { useWizardStore } from "@/store/wizard";
import { urlFor } from "@/sanity/lib/image";

type Props = { model: ProductModel };

function isSanityImage(img: ModelImage): img is ModelImage & { asset: { _ref: string; _type: string } } {
  return !!img?.asset?._ref;
}

export default function ModelCard({ model }: Props) {
  const openWizard = useWizardStore((s) => s.openWizard);
  const img = model.images?.[0] ?? null;
  const hasSanityImg = img !== null && isSanityImage(img);

  return (
    <article className="group flex flex-col bg-white border border-stone-100 rounded-2xl overflow-hidden hover:shadow-2xl hover:shadow-stone-900/10 hover:border-stone-200 transition-all duration-300 hover:-translate-y-1">
      {/* Image area */}
      <div className="relative h-52 overflow-hidden bg-stone-100">
        {hasSanityImg ? (
          <>
            <Image
              src={urlFor(img).width(600).height(400).fit("crop").auto("format").url()}
              alt={img.label ?? model.name}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
            {/* Subtle gradient so badges stay readable */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/10 pointer-events-none" />
          </>
        ) : (
          <CameraPlaceholder />
        )}

        {/* Tag badge */}
        {model.tag && (
          <div className="absolute top-3 left-3 z-10">
            <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full bg-sage-500 text-white shadow-md">
              {model.tag}
            </span>
          </div>
        )}

        {/* Size */}
        <div className="absolute bottom-3 right-3 z-10 font-mono text-white/80 text-sm font-semibold">
          {model.size} m²
        </div>

        {/* Video badge */}
        {(model.video?.url || (model.videos && model.videos.length > 0)) && (
          <div className="absolute bottom-3 left-3 z-10">
            <span className="flex items-center gap-1 text-[10px] font-semibold text-white/80 bg-black/40 backdrop-blur-sm px-2 py-1 rounded-full">
              <PlayIcon className="w-2.5 h-2.5" />
              Video
            </span>
          </div>
        )}
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

        {/* Price + CTAs */}
        <div className="mt-5 pt-5 border-t border-stone-100 flex items-end justify-between">
          <div>
            <p className="text-[10px] font-medium text-stone-400 uppercase tracking-wider leading-none">
              Desde
            </p>
            <p className="text-2xl font-bold text-stone-900 mt-1 leading-none">
              {model.priceUSD != null
                ? `USD ${model.priceUSD.toLocaleString("es-AR")}`
                : "Consultar precio"}
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
              onClick={() =>
                openWizard({
                  slug: model.slug,
                  name: model.name,
                  maxHabitaciones: model.maxHabitaciones,
                  permiteCocinaSiMax3Hab: model.permiteCocinaSiMax3Hab,
                })
              }
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

function CameraPlaceholder() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
      <svg className="w-10 h-10 text-stone-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
      </svg>
      <span className="text-xs text-stone-400">Sin fotos</span>
    </div>
  );
}

function PlayIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5v14l11-7z" />
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
