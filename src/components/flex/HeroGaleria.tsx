"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Play } from "lucide-react";
import { urlImagenCompleta } from "@/sanity/lib/image";

type SanityAsset = { _ref: string; _type: string };
type SanityImage = { asset?: SanityAsset; hotspot?: unknown; crop?: unknown; label?: string };
type VideoInput = { url: string; titulo?: string | null };

type GalleryItem =
  | { kind: "image"; src: string; isSanity: boolean; alt: string }
  | { kind: "video"; url: string; embedUrl: string; label: string; videoId: string | null };

// Fotos reales de unidades MOVARA (recortes del catálogo del proveedor Heshi
// verificados a mano — hay archivos mal nombrados en /public/configurador
// así que estas rutas se eligieron por contenido, no por nombre de archivo).
const FALLBACK_PHOTOS = [
  { src: "/interiorcocina.png", alt: "Interior — living y cocina integrados" },
  { src: "/configurador/decoracion/decor-cocina.jpg", alt: "Cocina equipada" },
  { src: "/configurador/decoracion/decor-living.jpg", alt: "Living" },
  { src: "/configurador/decoracion/decor-dormitorio.jpg", alt: "Dormitorio" },
  { src: "/configurador-clean/exterior/ext-vidrio-frontal.jpg", alt: "Baño" },
  { src: "/configurador/exterior/ext-calada-madera-clara.jpg", alt: "Exterior" },
];

const SWIPE_THRESHOLD = 48;

function getYoutubeId(url: string): string | null {
  // youtu.be/ID — formato corto
  // youtube.com/watch?v=ID — formato estándar
  // youtube.com/embed/ID — ya es un embed, se usa el ID directo
  // youtube.com/shorts/ID — Shorts
  // youtube.com/live/ID — transmisión en vivo / VOD de live
  return (
    url.match(/youtu\.be\/([^&?/]+)/)?.[1] ??
    url.match(/youtube\.com\/watch\?v=([^&]+)/)?.[1] ??
    url.match(/youtube\.com\/embed\/([^&?/]+)/)?.[1] ??
    url.match(/youtube\.com\/shorts\/([^&?/]+)/)?.[1] ??
    url.match(/youtube\.com\/live\/([^&?/]+)/)?.[1] ??
    // Red de seguridad: cualquier otra URL de youtube.com/youtu.be con un ID
    // de 11 caracteres en la ruta — cubre formatos nuevos que YouTube agregue
    // a futuro sin que se cuele una URL de youtube.com sin convertir.
    url.match(/(?:youtube\.com|youtu\.be)\/(?:[^\s?&]*\/)*?([A-Za-z0-9_-]{11})(?:[?&]|$)/)?.[1] ??
    null
  );
}

function getEmbedUrl(url: string): string {
  const youtubeId = getYoutubeId(url);
  if (youtubeId) return `https://www.youtube-nocookie.com/embed/${youtubeId}?rel=0&modestbranding=1`;

  const vimeo = url.match(/vimeo\.com\/(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}?autoplay=1`;
  return url;
}

function isDirectVideo(url: string): boolean {
  return /\.(mp4|webm|ogg)(\?|$)/i.test(url);
}

function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  return el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable;
}

// Thumbnail de video: preview real de YouTube (maxresdefault) con ícono de
// play encima. Si el video no tiene maxresdefault, YouTube no devuelve un
// 404 — responde 200 con un placeholder gris de 120x90, así que hay que
// detectar ese tamaño en onLoad y recién ahí caer a hqdefault (que sí existe
// siempre). Sin video ID (o si también falla hqdefault) se muestra el
// fallback gris con el ícono de play, como antes.
function VideoThumb({ videoId, label }: { videoId: string | null; label: string }) {
  const [src, setSrc] = useState(videoId ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg` : null);
  const [failed, setFailed] = useState(false);

  return (
    <div className="absolute inset-0 bg-stone-800">
      {src && !failed && (
        <Image
          src={src}
          alt={label}
          fill
          className="object-contain"
          sizes="80px"
          onLoad={(e) => {
            const img = e.currentTarget;
            if (img.naturalWidth === 120 && img.naturalHeight === 90 && !src.includes("hqdefault")) {
              setSrc(`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`);
            }
          }}
          onError={() => setFailed(true)}
        />
      )}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full bg-black/50 flex items-center justify-center">
          <Play className="w-3.5 h-3.5 text-white ml-0.5" fill="white" />
        </div>
      </div>
    </div>
  );
}

export default function HeroGaleria({
  title,
  ctaLabel,
  ctaHref,
  images,
  videos,
}: {
  title: string;
  ctaLabel: string;
  ctaHref: string;
  images?: SanityImage[] | null;
  videos?: VideoInput[] | null;
}) {
  const validImages = (images ?? []).filter((img) => !!img?.asset?._ref);
  const hasSanityImages = validImages.length > 0;

  const imageItems: GalleryItem[] = hasSanityImages
    ? validImages.map((img, i) => ({
        kind: "image" as const,
        // Foto completa: un solo eje con fit("max") (width y height juntos
        // forzarían un rect= que recorta). Respeta el crop del Studio si
        // está cargado.
        src: urlImagenCompleta(img, 1800),
        isSanity: true,
        alt: img.label ?? `${title} — foto ${i + 1}`,
      }))
    : FALLBACK_PHOTOS.map((p) => ({
        kind: "image" as const,
        src: p.src,
        isSanity: false,
        alt: `${title} — ${p.alt}`,
      }));

  const videoItems: GalleryItem[] =
    videos?.map((v) => ({
      kind: "video" as const,
      url: v.url,
      embedUrl: getEmbedUrl(v.url),
      label: v.titulo ?? "Video",
      videoId: getYoutubeId(v.url),
    })) ?? [];

  const items: GalleryItem[] = [...imageItems, ...videoItems];
  const total = items.length;

  const [selected, setSelected] = useState(0);
  const active = items[selected];
  const activeThumbRef = useRef<HTMLButtonElement>(null);
  const touchStartX = useRef<number | null>(null);

  function goNext() {
    setSelected((s) => (s + 1) % total);
  }
  function goPrev() {
    setSelected((s) => (s - 1 + total) % total);
  }

  // Navegación por teclado — flechas izquierda/derecha en toda la página.
  useEffect(() => {
    if (total <= 1) return;
    function onKeyDown(e: KeyboardEvent) {
      if (isTypingTarget(e.target)) return;
      if (e.key === "ArrowRight") setSelected((s) => (s + 1) % total);
      else if (e.key === "ArrowLeft") setSelected((s) => (s - 1 + total) % total);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [total]);

  // Mantiene el thumbnail activo visible dentro de la fila con scroll horizontal.
  useEffect(() => {
    activeThumbRef.current?.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });
  }, [selected]);

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null || total <= 1) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(delta) > SWIPE_THRESHOLD) {
      if (delta < 0) goNext();
      else goPrev();
    }
    touchStartX.current = null;
  }

  return (
    <div className="relative w-full h-[calc(100dvh-4rem)] bg-black flex flex-col overflow-hidden">
      {/* Imagen/video principal — 80% de la altura disponible */}
      <div
        className="relative flex-[4] min-h-0"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={selected}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0"
          >
            {active.kind === "video" ? (
              isDirectVideo(active.url) ? (
                <video
                  src={active.url}
                  controls
                  autoPlay
                  className="absolute inset-0 w-full h-full object-contain"
                  aria-label={active.label}
                />
              ) : (
                <iframe
                  src={active.embedUrl}
                  title={active.label}
                  width="100%"
                  height="100%"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  frameBorder="0"
                  className="absolute inset-0 w-full h-full border-0"
                />
              )
            ) : (
              <Image
                src={active.src}
                alt={active.alt}
                fill
                priority={selected === 0}
                className="object-contain"
                sizes="100vw"
              />
            )}
          </motion.div>
        </AnimatePresence>

        {/* Flechas prev/next — grandes, siempre visibles */}
        {total > 1 && (
          <>
            <button
              type="button"
              onClick={goPrev}
              aria-label="Foto anterior"
              className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 z-20 w-11 h-11 sm:w-14 sm:h-14 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur-sm text-white flex items-center justify-center transition-colors"
            >
              <ChevronLeft size={28} />
            </button>
            <button
              type="button"
              onClick={goNext}
              aria-label="Foto siguiente"
              className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 z-20 w-11 h-11 sm:w-14 sm:h-14 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur-sm text-white flex items-center justify-center transition-colors"
            >
              <ChevronRight size={28} />
            </button>
          </>
        )}

        {/* Contador */}
        {total > 1 && (
          <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-20">
            <span className="bg-black/50 backdrop-blur-sm text-white text-xs sm:text-sm font-semibold px-3 py-1.5 rounded-full tabular-nums">
              {selected + 1} / {total}
            </span>
          </div>
        )}

        {/* Nombre del modelo + CTA — esquina inferior izquierda */}
        <div className="absolute bottom-4 left-4 sm:bottom-6 sm:left-6 z-20 flex flex-col items-start gap-2.5 max-w-[80%]">
          <span className="bg-black/50 backdrop-blur-md text-white font-bold text-base sm:text-xl px-4 py-2 sm:px-5 sm:py-2.5 rounded-full">
            {title}
          </span>
          <a
            href={ctaHref}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-white/20 hover:bg-white/30 backdrop-blur-md border border-white/40 text-white font-bold text-sm sm:text-base px-4 py-2 sm:px-6 sm:py-3 rounded-full transition-colors whitespace-nowrap"
          >
            {ctaLabel}
          </a>
        </div>
      </div>

      {/* Thumbnails — 20% de la altura, con scroll horizontal si no entran */}
      <div className="relative flex-1 min-h-0 bg-black border-t border-white/10">
        <div className="h-full flex items-center gap-2.5 overflow-x-auto px-4 sm:px-6 scroll-smooth">
          {items.map((item, i) => {
            const isActive = i === selected;
            return (
              <button
                key={i}
                ref={isActive ? activeThumbRef : undefined}
                type="button"
                onClick={() => setSelected(i)}
                aria-label={item.kind === "video" ? item.label : item.alt}
                aria-pressed={isActive}
                className={`relative h-[70%] aspect-square shrink-0 rounded-lg overflow-hidden border-2 bg-stone-900 transition-colors ${
                  isActive ? "border-sage-500" : "border-transparent"
                }`}
              >
                {item.kind === "video" ? (
                  <VideoThumb videoId={item.videoId} label={item.label} />
                ) : (
                  <Image src={item.src} alt={item.alt} fill className="object-contain" sizes="80px" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
