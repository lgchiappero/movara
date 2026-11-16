import { useSyncExternalStore } from "react";

/** Aviso de "tenés datos cargados" para el botón Volver del header.
 *
 * La página que tiene un formulario largo (hoy, el configurador) marca acá
 * si hay algo que se perdería al salir; BotonVolver lo lee y, si está
 * marcado, pide confirmación antes de irse. Store mínimo de módulo para no
 * tener que pasar props entre el layout y la página. */

let mensaje: string | null = null;
const oyentes = new Set<() => void>();

/** `null` = no hay nada que perder. */
export function marcarSalidaProtegida(texto: string | null): void {
  if (texto === mensaje) return;
  mensaje = texto;
  oyentes.forEach((o) => o());
}

export function mensajeSalidaProtegida(): string | null {
  return mensaje;
}

function suscribir(oyente: () => void) {
  oyentes.add(oyente);
  return () => {
    oyentes.delete(oyente);
  };
}

export function useSalidaProtegida(): string | null {
  return useSyncExternalStore(suscribir, mensajeSalidaProtegida, () => null);
}
