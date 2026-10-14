import { FLEX_MODELO_SLUG } from "@/sanity/lib/queries";

/** Página de un modelo. El Flex tiene página propia: se evita el redirect de
 * /modelos/movara-flex. */
export function hrefModelo(slug?: string | null): string {
  if (!slug) return "/modelos";
  return slug === FLEX_MODELO_SLUG ? "/modelos/flex" : `/modelos/${slug}`;
}
