/** Página padre lógica de cada ruta pública: adónde lleva "Volver" cuando
 * se entró directo (WhatsApp, email, Google) y no hay a qué volver dentro del
 * sitio. ÚNICO lugar donde se define: el resto (BotonVolver, tests) lo lee de
 * acá.
 *
 * Se recorre en orden y gana la primera regla que coincide. Lo que no
 * coincide con ninguna (agendar, recibo, mi-pedido, legales, 404 y cualquier
 * ruta nueva) vuelve a la home. */
export const PADRES: readonly { patron: RegExp; padre: string }[] = [
  // Ficha técnica del Flex → su modelo.
  { patron: /^\/producto(\/|$)/, padre: "/modelos/flex" },
  // Cualquier modelo (/modelos/[slug], /modelos/flex) → catálogo.
  { patron: /^\/modelos\/[^/]+/, padre: "/modelos" },
];

export const PADRE_POR_DEFECTO = "/";

export function paginaPadre(pathname: string): string {
  const ruta = pathname.split(/[?#]/)[0].replace(/\/+$/, "") || "/";
  return PADRES.find(({ patron }) => patron.test(ruta))?.padre ?? PADRE_POR_DEFECTO;
}
