"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { MaterialImage } from "./MaterialImage";

/** Foto de una opción a pantalla completa. Se cierra tocando en cualquier
 *  lado, con el botón Cerrar o con Escape. Va en un portal sobre <body>: el
 *  paso del configurador está dentro de un motion.div con transform, que
 *  rompería el position: fixed. */
export function FotoAmpliada({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  const cerrarRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previo = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    cerrarRef.current?.focus();
    const alTeclado = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", alTeclado);
    return () => {
      document.body.style.overflow = previo;
      window.removeEventListener("keydown", alTeclado);
    };
  }, [onClose]);

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Foto ampliada: ${alt}`}
      onClick={onClose}
      className="fixed inset-0 z-[70] bg-black/95 flex flex-col items-center justify-center px-3 pt-16 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] cursor-zoom-out"
    >
      <button
        ref={cerrarRef}
        type="button"
        onClick={onClose}
        aria-label="Cerrar foto ampliada"
        className="absolute top-3 right-3 w-11 h-11 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center"
      >
        <svg aria-hidden className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
      <div className="relative w-full flex-1 max-w-3xl">
        <MaterialImage src={src} alt={alt} sizes="100vw" fit="contain" />
      </div>
      <p className="mt-3 text-sm font-semibold text-white/90 text-center">{alt}</p>
      <p className="text-xs text-white/50">Tocá en cualquier lado para cerrar</p>
    </div>,
    document.body
  );
}
