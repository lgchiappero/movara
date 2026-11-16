"use client";

import { useEffect, useId, useRef } from "react";

type Props = {
  abierto: boolean;
  titulo: string;
  mensaje: string;
  confirmar: string;
  cancelar: string;
  onConfirmar: () => void;
  onCancelar: () => void;
};

/** Diálogo de confirmación con la marca (en lugar de window.confirm()).
 * Escape o un clic afuera cancelan; el foco arranca en la opción segura. */
export default function ModalConfirmacion({ abierto, titulo, mensaje, confirmar, cancelar, onConfirmar, onCancelar }: Props) {
  const id = useId();
  const botonCancelar = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!abierto) return;
    botonCancelar.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancelar();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [abierto, onCancelar]);

  if (!abierto) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancelar();
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={`${id}-titulo`}
        aria-describedby={`${id}-mensaje`}
        className="w-full max-w-sm rounded-2xl bg-[#1A1A1A] border border-[#D4B36A]/30 p-6 text-stone-200 shadow-2xl"
      >
        <h2 id={`${id}-titulo`} className="text-lg font-semibold text-white">
          {titulo}
        </h2>
        <p id={`${id}-mensaje`} className="mt-2 text-sm leading-relaxed text-stone-400">
          {mensaje}
        </p>
        <div className="mt-6 flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
          <button
            type="button"
            onClick={onConfirmar}
            className="min-h-11 px-5 rounded-xl border border-stone-600 text-sm font-medium text-stone-300 hover:border-stone-400 transition-colors"
          >
            {confirmar}
          </button>
          <button
            ref={botonCancelar}
            type="button"
            onClick={onCancelar}
            className="min-h-11 px-5 rounded-xl bg-[#D4B36A] hover:bg-[#c1a25a] text-sm font-bold text-[#1A1A1A] transition-colors"
          >
            {cancelar}
          </button>
        </div>
      </div>
    </div>
  );
}
