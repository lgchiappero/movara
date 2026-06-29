"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { urlFor } from "@/sanity/lib/image";

type SanityAsset = { _ref: string; _type: string };

export type GalleryImage = {
  gradient?: string;
  accent?: string;
  asset?: SanityAsset;
  hotspot?: unknown;
  crop?: unknown;
  label?: string;
};

type GalleryItem =
  | { kind: "image"; img: GalleryImage }
  | { kind: "video"; url: string; embedUrl: string; label: string };

const FALLBACK_IMG: GalleryImage = {
  gradient: "from-sage-900 via-sage-800 to-sage-950",
  accent: "#819874",
  label: "Vista exterior",
};

function isSanityImage(img: GalleryImage): img is GalleryImage & { asset: SanityAsset } {
  return !!img.asset?._ref;
}

function getEmbedUrl(url: string): string {
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?/]+)/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}?autoplay=1&rel=0`;
  const vimeo = url.match(/vimeo\.com\/(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}?autoplay=1`;
  return url;
}

function isDirectVideo(url: string): boolean {
  return /\.(mp4|webm|ogg)(\?|$)/i.test(url);
}

type Props = {
  images?: GalleryImage[] | null;
  modelName: string;
  video?: { url: string; label?: string } | null;
};

export default function ImageGallery({ images, modelName, video }: Props) {
  const items: GalleryItem[] = [
    ...(video?.url
      ? [
          {
            kind: "video" as const,
            url: video.url,
            embedUrl: getEmbedUrl(video.url),
            label: video.label ?? "Video del modelo",
          },
        ]
      : []),
    ...(images && images.length > 0
      ? images.map((img) => ({ kind: "image" as const, img }))
      : [{ kind: "image" as const, img: FALLBACK_IMG }]),
  ];

  const [selected, setSelected] = useState(0);
  const active = items[selected];
  const touchStartX = useRef<number | null>(null);

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null || items.length <= 1) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(delta) > 48) {
      setSelected((s) =>
        delta < 0 ? (s + 1) % items.length : (s - 1 + items.length) % items.length
      );
    }
    touchStartX.current = null;
  }

  return (
    <div className="space-y-3">
      {/* Main display */}
      <div
        className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden bg-sage-900"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {active.kind === "video" ? (
          isDirectVideo(active.url) ? (
            <video
              src={active.url}
              controls
              autoPlay
              className="absolute inset-0 w-full h-full object-cover"
              aria-label={active.label}
            />
          ) : (
            <iframe
              src={active.embedUrl}
              title={active.label}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="absolute inset-0 w-full h-full border-0"
            />
          )
        ) : isSanityImage(active.img) ? (
          <Image
            src={urlFor(active.img).width(900).height(675).fit("crop").auto("format").url()}
            alt={active.img.label ?? modelName}
            fill
            className="object-cover transition-opacity duration-500"
            sizes="(max-width: 768px) 100vw, 60vw"
            priority={selected === 0}
          />
        ) : (
          <div className={`absolute inset-0 bg-gradient-to-br ${active.img.gradient ?? FALLBACK_IMG.gradient}`}>
            <HouseScene accent={active.img.accent ?? FALLBACK_IMG.accent!} />
          </div>
        )}

        {/* Label — not shown for iframes (has title) */}
        {(active.kind === "image" || isDirectVideo(active.url)) && active.kind !== "video" && active.img.label && (
          <div className="absolute bottom-4 left-4 z-10">
            <span className="text-xs font-semibold text-white/80 bg-black/30 backdrop-blur-sm px-3 py-1.5 rounded-full">
              {active.img.label}
            </span>
          </div>
        )}

        {/* Nav arrows */}
        {items.length > 1 && (
          <>
            <button
              onClick={() => setSelected((s) => (s - 1 + items.length) % items.length)}
              className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-black/30 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/50 transition-colors"
              aria-label="Imagen anterior"
            >
              <ChevronLeftIcon />
            </button>
            <button
              onClick={() => setSelected((s) => (s + 1) % items.length)}
              className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-black/30 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/50 transition-colors"
              aria-label="Imagen siguiente"
            >
              <ChevronRightIcon />
            </button>
          </>
        )}

        {/* Counter */}
        {items.length > 1 && (
          <div className="absolute bottom-4 right-4 z-10">
            <span className="text-xs font-semibold text-white/80 bg-black/40 backdrop-blur-sm px-2.5 py-1 rounded-full tabular-nums">
              {selected + 1} / {items.length}
            </span>
          </div>
        )}
      </div>

      {/* Thumbnails */}
      {items.length > 1 && (
        <div className="grid grid-cols-4 gap-2">
          {items.map((item, i) => (
            <button
              key={i}
              onClick={() => setSelected(i)}
              className={`relative aspect-[4/3] rounded-xl overflow-hidden bg-sage-900 transition-all duration-200 ${
                i === selected ? "ring-2 ring-sage-500 ring-offset-2" : "opacity-60 hover:opacity-80"
              }`}
              aria-label={item.kind === "video" ? item.label : (item.img.label ?? `Imagen ${i + 1}`)}
            >
              {item.kind === "video" ? (
                <VideoThumbnail label={item.label} />
              ) : isSanityImage(item.img) ? (
                <Image
                  src={urlFor(item.img).width(200).height(150).fit("crop").auto("format").url()}
                  alt={item.img.label ?? `Imagen ${i + 1}`}
                  fill
                  className="object-cover"
                  sizes="25vw"
                />
              ) : (
                <div className={`absolute inset-0 bg-gradient-to-br ${item.img.gradient ?? FALLBACK_IMG.gradient}`}>
                  <MiniHouse accent={item.img.accent ?? FALLBACK_IMG.accent!} />
                </div>
              )}
              {item.kind === "image" && (
                <div className="absolute inset-0 flex items-end p-1.5">
                  <span className="text-[9px] text-white/60 leading-tight truncate">
                    {item.img.label}
                  </span>
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function VideoThumbnail({ label }: { label: string }) {
  return (
    <div className="absolute inset-0 bg-gradient-to-br from-stone-900 to-stone-800 flex flex-col items-center justify-center gap-1">
      <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
        <svg className="w-4 h-4 text-white ml-0.5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M8 5v14l11-7z" />
        </svg>
      </div>
      <span className="text-[8px] text-white/60 font-medium truncate px-1 max-w-full">{label}</span>
    </div>
  );
}

function HouseScene({ accent }: { accent: string }) {
  return (
    <svg viewBox="0 0 600 450" className="absolute inset-0 w-full h-full opacity-30" fill="none">
      <line x1="20" y1="390" x2="580" y2="390" stroke={accent} strokeWidth="1" strokeDasharray="6 8" />
      <rect x="100" y="210" width="400" height="180" rx="3" stroke={accent} strokeWidth="2" />
      <polyline points="70,210 300,80 530,210" stroke={accent} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
      <rect x="420" y="110" width="30" height="64" rx="2" stroke={accent} strokeWidth="2" />
      <rect x="415" y="107" width="40" height="8" rx="1" stroke={accent} strokeWidth="1.5" />
      <rect x="235" y="285" width="90" height="105" rx="4" stroke={accent} strokeWidth="2" opacity="0.9" />
      <line x1="280" y1="285" x2="280" y2="390" stroke={accent} strokeWidth="1.5" />
      <circle cx="316" cy="340" r="5" fill={accent} opacity="0.9" />
      <rect x="125" y="255" width="72" height="56" rx="3" stroke={accent} strokeWidth="2" />
      <line x1="161" y1="255" x2="161" y2="311" stroke={accent} strokeWidth="1.5" />
      <line x1="125" y1="283" x2="197" y2="283" stroke={accent} strokeWidth="1.5" />
      <rect x="403" y="255" width="72" height="56" rx="3" stroke={accent} strokeWidth="2" />
      <line x1="439" y1="255" x2="439" y2="311" stroke={accent} strokeWidth="1.5" />
      <line x1="403" y1="283" x2="475" y2="283" stroke={accent} strokeWidth="1.5" />
      <rect x="215" y="120" width="38" height="22" rx="1" stroke={accent} strokeWidth="2" opacity="0.85" />
      <line x1="234" y1="120" x2="234" y2="142" stroke={accent} strokeWidth="1" opacity="0.7" />
      <rect x="262" y="113" width="38" height="22" rx="1" stroke={accent} strokeWidth="2" opacity="0.85" />
      <line x1="281" y1="113" x2="281" y2="135" stroke={accent} strokeWidth="1" opacity="0.7" />
    </svg>
  );
}

function MiniHouse({ accent }: { accent: string }) {
  return (
    <svg viewBox="0 0 120 90" className="absolute inset-0 w-full h-full opacity-20" fill="none">
      <polyline points="10,50 60,15 110,50" stroke={accent} strokeWidth="2" strokeLinejoin="round" />
      <rect x="20" y="50" width="80" height="34" rx="1" stroke={accent} strokeWidth="1.5" />
      <rect x="47" y="62" width="26" height="22" rx="1" stroke={accent} strokeWidth="1.5" />
      <rect x="26" y="57" width="16" height="12" rx="1" stroke={accent} strokeWidth="1.5" />
      <rect x="78" y="57" width="16" height="12" rx="1" stroke={accent} strokeWidth="1.5" />
    </svg>
  );
}

function ChevronLeftIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}
