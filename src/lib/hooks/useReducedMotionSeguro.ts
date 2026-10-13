"use client";

import { useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

function suscribir(avisar: () => void) {
  const mq = window.matchMedia?.(QUERY);
  mq?.addEventListener?.("change", avisar);
  return () => mq?.removeEventListener?.("change", avisar);
}

/** prefers-reduced-motion sin errores de hidratación. El useReducedMotion
 * de Framer da null en el servidor y true en el primer render del cliente,
 * así que lo que se renderiza distinto según ese valor no coincide con el
 * HTML del servidor. Acá el render de hidratación usa siempre `false` (igual
 * que el servidor) y React vuelve a renderizar con el valor real apenas
 * hidrata. */
export function useReducedMotionSeguro(): boolean {
  return useSyncExternalStore(
    suscribir,
    () => window.matchMedia?.(QUERY).matches ?? false,
    () => false
  );
}
