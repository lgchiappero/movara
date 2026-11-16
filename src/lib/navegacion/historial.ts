/** ¿Hay una página anterior DENTRO del sitio a la que volver con
 * router.back()? Si se entró directo (WhatsApp, email, Google) la respuesta
 * es no, y "Volver" tiene que ir a la página padre en lugar de sacar a la
 * persona del sitio.
 *
 * 1. Navigation API (Chrome, Edge, Safari 26+, Firefox 147+): sus entradas
 *    solo incluyen las del mismo origen contiguas, así que índice > 0 quiere
 *    decir que la anterior es del sitio. Es exacta, incluso tras recargar.
 * 2. Sin esa API: una pila en memoria con las rutas que se visitaron en esta
 *    carga de la página. Una recarga la vacía y "Volver" va al padre, que
 *    es lo seguro. */

type EntradaNavegacion = { index: number };
type NavigationLike = { currentEntry?: EntradaNavegacion | null };

let pila: string[] = [];

/** Lo llama BotonVolver cada vez que cambia la ruta. Si la ruta nueva es la
 * anterior de la pila, se interpreta como un "atrás" (del navegador o del
 * botón) y se desapila. */
export function registrarRuta(pathname: string): void {
  if (pila[pila.length - 1] === pathname) return;
  if (pila[pila.length - 2] === pathname) {
    pila.pop();
    return;
  }
  pila.push(pathname);
}

function navigationApi(): NavigationLike | undefined {
  return (window as unknown as { navigation?: NavigationLike }).navigation;
}

export function hayHistorialInterno(): boolean {
  const entrada = navigationApi()?.currentEntry;
  if (entrada) return entrada.index > 0;
  return pila.length > 1;
}

/** Solo para tests. */
export function reiniciarHistorial(): void {
  pila = [];
}
