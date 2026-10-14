"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Compass, Maximize2, X } from "lucide-react";

const DORADO = "#D4B36A";

type TourRoom = {
  id: string;
  label: string;
  file: string;
};

// Recorrido mínimo pedido: Exterior → Entrada → Living → Cocina → Baño →
// Dormitorio 1 → Dormitorio 2 → Exterior (loop). Las fotos van en
// /public/tour/ con estos nombres exactos — cuando se suben los archivos
// reales, reemplazan al placeholder automáticamente (mismo path, sin
// tocar código).
const TOUR_ROOMS: TourRoom[] = [
  { id: "exterior", label: "Exterior", file: "01-exterior.jpg" },
  { id: "entrada", label: "Entrada", file: "02-entrada.jpg" },
  { id: "living", label: "Living", file: "03-living.jpg" },
  { id: "cocina", label: "Cocina", file: "04-cocina.jpg" },
  { id: "bano", label: "Baño", file: "05-bano.jpg" },
  { id: "dormitorio-1", label: "Dormitorio 1", file: "06-dormitorio-1.jpg" },
  { id: "dormitorio-2", label: "Dormitorio 2", file: "07-dormitorio-2.jpg" },
];

const MIN_ZOOM = 1;
const MAX_ZOOM = 3;
const SWIPE_THRESHOLD = 48;

// Tour virtual oculto hasta nuevo aviso — el componente y sus fotos quedan
// intactos, listos para reactivar con solo volver esto a `true`.
export const TOUR_ENABLED = false;

function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  return el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable;
}

function distance(a: React.Touch, b: React.Touch): number {
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
}

export default function VirtualTour({
  modelName,
  triggerLabel = "Recorrer la casa",
  className = "",
}: {
  modelName?: string;
  triggerLabel?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  if (!TOUR_ENABLED) return null;

  return (
    <section className={className} style={{ fontFamily: "var(--font-montserrat)" }}>
      <h2 className="text-xl font-bold text-stone-900 pb-3 border-b border-stone-100">
        Tour interactivo
      </h2>
      <p className="text-sm text-stone-500 mt-3 mb-5">
        Recorré {modelName ? `el ${modelName}` : "la casa"} ambiente por ambiente, a tu ritmo.
      </p>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-3 px-6 py-3.5 rounded-xl font-bold transition-colors shadow-sm"
        style={{ backgroundColor: DORADO, color: "#1C1C1C" }}
      >
        <Compass className="w-5 h-5" />
        {triggerLabel}
      </button>

      {open && <TourModal modelName={modelName} onClose={() => setOpen(false)} />}
    </section>
  );
}

function TourModal({ modelName, onClose }: { modelName?: string; onClose: () => void }) {
  const [index, setIndex] = useState(0);
  const [brokenIds, setBrokenIds] = useState<Set<string>>(new Set());

  const room = TOUR_ROOMS[index];
  const total = TOUR_ROOMS.length;

  function goNext() {
    setIndex((i) => (i + 1) % total);
  }
  function goPrev() {
    setIndex((i) => (i - 1 + total) % total);
  }
  function goTo(i: number) {
    setIndex(i);
  }

  // Bloquea el scroll de fondo y habilita cierre + navegación por teclado.
  useEffect(() => {
    document.body.style.overflow = "hidden";
    function onKeyDown(e: KeyboardEvent) {
      if (isTypingTarget(e.target)) return;
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") goNext();
      else if (e.key === "ArrowLeft") goPrev();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total]);

  const nextRoom = TOUR_ROOMS[(index + 1) % total];
  const isBroken = brokenIds.has(room.id);

  return (
    <div
      className="fixed inset-0 z-50 bg-[#1C1C1C] flex flex-col"
      style={{ fontFamily: "var(--font-montserrat)" }}
      role="dialog"
      aria-modal="true"
      aria-label={`Tour interactivo — ${modelName ?? "MOVARA"}`}
    >
      {/* Toolbar */}
      <div className="flex items-center justify-between px-5 py-3 bg-black/40 backdrop-blur-sm shrink-0 z-30">
        <div className="flex items-center gap-2 text-white">
          <Compass className="w-5 h-5" style={{ color: DORADO }} />
          <span className="font-semibold text-sm">Tour interactivo{modelName ? ` — ${modelName}` : ""}</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar tour"
          className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Imagen del ambiente */}
      <div className="relative flex-1 min-h-0 overflow-hidden bg-black">
        <AnimatePresence mode="wait">
          <motion.div
            key={room.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0"
          >
            {isBroken ? (
              <TourPlaceholder label={room.label} />
            ) : (
              <RoomImage
                src={`/tour/${room.file}`}
                alt={room.label}
                priority={index === 0}
                onBroken={() => setBrokenIds((prev) => new Set(prev).add(room.id))}
                onSwipeNext={goNext}
                onSwipePrev={goPrev}
              />
            )}
          </motion.div>
        </AnimatePresence>

        {/* Flechas prev/next */}
        <button
          type="button"
          onClick={goPrev}
          aria-label="Ambiente anterior"
          className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 z-20 w-11 h-11 sm:w-14 sm:h-14 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur-sm text-white flex items-center justify-center transition-colors"
        >
          <ChevronLeft size={28} />
        </button>
        <button
          type="button"
          onClick={goNext}
          aria-label="Ambiente siguiente"
          className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 z-20 w-11 h-11 sm:w-14 sm:h-14 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur-sm text-white flex items-center justify-center transition-colors"
        >
          <ChevronRight size={28} />
        </button>

        {/* Hotspot — siguiente ambiente */}
        <button
          type="button"
          onClick={goNext}
          aria-label={`Ir a ${nextRoom.label}`}
          className="absolute bottom-4 sm:bottom-6 right-3 sm:right-6 z-20 flex items-center gap-2 px-4 py-2 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur-sm text-white text-sm font-semibold transition-colors"
        >
          {nextRoom.label}
          <ChevronRight size={16} style={{ color: DORADO }} />
        </button>

        {/* Ambiente actual + contador */}
        <div className="absolute top-4 sm:top-6 left-4 sm:left-6 z-20 flex items-center gap-2.5">
          <span className="bg-black/50 backdrop-blur-sm text-white font-bold text-sm sm:text-base px-4 py-2 rounded-full">
            {room.label}
          </span>
          <span className="bg-black/50 backdrop-blur-sm text-white text-xs sm:text-sm font-semibold px-3 py-1.5 rounded-full tabular-nums">
            {index + 1} / {total}
          </span>
        </div>

        {/* Ayuda de zoom (desktop) */}
        <div className="hidden sm:flex absolute bottom-6 left-6 z-20 items-center gap-1.5 text-white/70 text-xs bg-black/40 backdrop-blur-sm px-3 py-1.5 rounded-full">
          <Maximize2 size={12} />
          Doble click o scroll para hacer zoom
        </div>
      </div>

      {/* Puntos de navegación — un ambiente por botón */}
      <div className="shrink-0 bg-black/60 backdrop-blur-sm px-4 sm:px-6 py-3">
        <div className="flex items-center gap-2 overflow-x-auto scroll-smooth">
          {TOUR_ROOMS.map((r, i) => {
            const isActive = i === index;
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => goTo(i)}
                aria-pressed={isActive}
                className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-semibold border-2 transition-colors whitespace-nowrap ${
                  isActive ? "text-[#1C1C1C]" : "text-white/70 border-transparent hover:text-white"
                }`}
                style={isActive ? { backgroundColor: DORADO, borderColor: DORADO } : undefined}
              >
                {r.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Imagen de un ambiente con zoom (rueda / pinch / doble click) y pan
// (arrastre). El zoom y el pan viven acá adentro: como este componente se
// desmonta y remonta cada vez que cambia el ambiente (key={room.id} en el
// padre), arrancan limpios en cada ambiente sin necesidad de un efecto.
function RoomImage({
  src,
  alt,
  priority,
  onBroken,
  onSwipeNext,
  onSwipePrev,
}: {
  src: string;
  alt: string;
  priority: boolean;
  onBroken: () => void;
  onSwipeNext: () => void;
  onSwipePrev: () => void;
}) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);

  const lastPointer = useRef({ x: 0, y: 0 });
  const touchStartX = useRef<number | null>(null);
  const pinchStartDist = useRef<number | null>(null);
  const pinchStartZoom = useRef(1);

  function clampZoom(z: number) {
    return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));
  }

  function handleWheel(e: React.WheelEvent) {
    e.preventDefault();
    setZoom((z) => {
      const next = clampZoom(z - e.deltaY * 0.0015);
      if (next === MIN_ZOOM) setPan({ x: 0, y: 0 });
      return next;
    });
  }

  function handleDoubleClick() {
    setZoom((z) => (z > MIN_ZOOM ? MIN_ZOOM : 2.4));
    setPan({ x: 0, y: 0 });
  }

  function handlePointerDown(e: React.PointerEvent) {
    if (zoom <= MIN_ZOOM) return;
    setIsPanning(true);
    lastPointer.current = { x: e.clientX, y: e.clientY };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!isPanning) return;
    const dx = e.clientX - lastPointer.current.x;
    const dy = e.clientY - lastPointer.current.y;
    lastPointer.current = { x: e.clientX, y: e.clientY };
    setPan((p) => ({ x: p.x + dx, y: p.y + dy }));
  }

  function handlePointerUp() {
    setIsPanning(false);
  }

  function handleTouchStart(e: React.TouchEvent) {
    if (e.touches.length === 2) {
      pinchStartDist.current = distance(e.touches[0], e.touches[1]);
      pinchStartZoom.current = zoom;
    } else if (e.touches.length === 1) {
      touchStartX.current = e.touches[0].clientX;
    }
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (e.touches.length === 2 && pinchStartDist.current) {
      e.preventDefault();
      const newDist = distance(e.touches[0], e.touches[1]);
      const nextZoom = clampZoom(pinchStartZoom.current * (newDist / pinchStartDist.current));
      setZoom(nextZoom);
    }
  }

  function handleTouchEnd(e: React.TouchEvent) {
    pinchStartDist.current = null;
    if (zoom > MIN_ZOOM || touchStartX.current === null) {
      touchStartX.current = null;
      return;
    }
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(delta) > SWIPE_THRESHOLD) {
      if (delta < 0) onSwipeNext();
      else onSwipePrev();
    }
    touchStartX.current = null;
  }

  return (
    <div
      className="absolute inset-0 touch-none select-none"
      onWheel={handleWheel}
      onDoubleClick={handleDoubleClick}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
        transition: isPanning ? "none" : "transform 0.15s ease-out",
        cursor: zoom > MIN_ZOOM ? "grab" : "default",
      }}
    >
      <Image
        src={src}
        alt={alt}
        fill
        priority={priority}
        draggable={false}
        className="object-contain"
        sizes="100vw"
        onError={onBroken}
      />
    </div>
  );
}

function TourPlaceholder({ label }: { label: string }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-stone-900 via-[#1C1C1C] to-stone-950">
      <div
        className="w-14 h-14 rounded-full flex items-center justify-center"
        style={{ backgroundColor: `${DORADO}1A` }}
      >
        <Compass className="w-7 h-7" style={{ color: DORADO }} />
      </div>
      <p className="text-white font-bold text-lg">{label}</p>
      <p className="text-stone-400 text-xs">Foto próximamente</p>
    </div>
  );
}
