"use client";

import { useState } from "react";

type Props = { url: string; modelName: string };

export default function VirtualTour({ url, modelName }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <section>
        <h2 className="text-xl font-bold text-stone-900 pb-3 border-b border-stone-100">
          Recorrido virtual 360°
        </h2>
        <p className="text-sm text-stone-500 mt-3 mb-5">
          Explorá el interior del {modelName} sin salir de casa.
        </p>
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-3 px-6 py-3.5 bg-sage-600 hover:bg-sage-700 text-white font-semibold rounded-xl transition-colors shadow-sm shadow-sage-900/20"
        >
          <TourIcon className="w-5 h-5" />
          Iniciar recorrido virtual
        </button>
      </section>

      {/* Fullscreen modal */}
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex flex-col"
          role="dialog"
          aria-modal="true"
          aria-label={`Tour virtual — ${modelName}`}
        >
          {/* Toolbar */}
          <div className="flex items-center justify-between px-5 py-3 bg-black/60 backdrop-blur-sm shrink-0">
            <div className="flex items-center gap-2 text-white">
              <TourIcon className="w-5 h-5 text-sage-400" />
              <span className="font-semibold text-sm">Recorrido virtual — {modelName}</span>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Cerrar tour virtual"
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
            >
              <CloseIcon className="w-5 h-5" />
            </button>
          </div>

          {/* iframe */}
          <iframe
            src={url}
            title={`Tour virtual 360° — ${modelName}`}
            allow="xr-spatial-tracking; accelerometer; gyroscope; fullscreen"
            allowFullScreen
            className="flex-1 w-full border-0"
          />
        </div>
      )}
    </>
  );
}

function TourIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
    </svg>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}
