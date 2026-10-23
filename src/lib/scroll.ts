/** Scroll del sitio: subir al principio y bajar a una sección de la home,
 * compensando el header fijo y respetando prefers-reduced-motion. */

const QUERY_MENOS_MOVIMIENTO = "(prefers-reduced-motion: reduce)";

/** Aire entre el header fijo y el título de la sección. */
export const MARGEN_BAJO_HEADER = 16;

export type DestinoInterno = { tipo: "inicio" } | { tipo: "seccion"; id: string };

/** "/" → inicio; "/#proceso" → sección "proceso"; cualquier otro href → null
 * (lo maneja Link normalmente). */
export function analizarHref(href: string): DestinoInterno | null {
  if (href === "/") return { tipo: "inicio" };
  const m = /^\/#([A-Za-z][\w-]*)$/.exec(href);
  return m ? { tipo: "seccion", id: m[1] } : null;
}

export function prefiereMenosMovimiento(): boolean {
  return window.matchMedia?.(QUERY_MENOS_MOVIMIENTO).matches ?? false;
}

/** "instant" y no "auto": "auto" hereda el scroll-behavior del CSS. */
export function comportamientoScroll(): ScrollBehavior {
  return prefiereMenosMovimiento() ? "instant" : "smooth";
}

/** Borde inferior de la barra del header fijo. Se mide la barra y no el
 * header entero porque el menú del celular, si está abierto, lo alarga. */
export function alturaHeader(): number {
  const barra = document.querySelector("[data-header-fijo] nav");
  return barra ? Math.max(0, barra.getBoundingClientRect().bottom) : 0;
}

/** Posición de layout del elemento. Usa offsetTop y no getBoundingClientRect
 * porque ignora los transform: la sección de contacto entra con un Reveal
 * que la desplaza 24px hacia abajo hasta que termina de animar. */
export function topDeLayout(el: HTMLElement): number {
  let y = 0;
  for (let n: HTMLElement | null = el; n; n = n.offsetParent as HTMLElement | null) y += n.offsetTop;
  return y;
}

function destinoDeSeccion(el: HTMLElement): number {
  return Math.max(0, topDeLayout(el) - alturaHeader() - MARGEN_BAJO_HEADER);
}

/** Corrección pendiente del último scrollASeccion. Se cancela si hay otro
 * scroll programado o si la persona mueve la página (rueda, touch, teclado),
 * para no llevarla de vuelta a la sección. */
let correccionPendiente: AbortController | null = null;

function cancelarCorreccion(): void {
  correccionPendiente?.abort();
  correccionPendiente = null;
}

export function scrollArriba(): void {
  cancelarCorreccion();
  window.scrollTo({ top: 0, behavior: comportamientoScroll() });
}

/** Baja a la sección con ese id. Si durante el scroll suave cambia el alto
 * de algo de arriba (imágenes que terminan de cargar), corrige al final. */
export function scrollASeccion(id: string): boolean {
  const el = document.getElementById(id);
  if (!el) return false;
  cancelarCorreccion();
  window.scrollTo({ top: destinoDeSeccion(el), behavior: comportamientoScroll() });

  const correccion = new AbortController();
  correccionPendiente = correccion;
  const { signal } = correccion;
  for (const evento of ["wheel", "touchstart", "keydown", "pointerdown"]) {
    window.addEventListener(evento, cancelarCorreccion, { once: true, passive: true, signal });
  }
  window.addEventListener(
    "scrollend",
    () => {
      cancelarCorreccion();
      const destino = destinoDeSeccion(el);
      if (Math.abs(window.scrollY - destino) > 2) window.scrollTo({ top: destino, behavior: "instant" });
    },
    { once: true, signal }
  );
  return true;
}
