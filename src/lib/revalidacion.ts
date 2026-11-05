// Qué páginas regenerar cuando se publica (crea, actualiza o borra) un
// documento en Sanity. Lo usa /api/revalidate, que llama el webhook del
// Studio. Si cambian las queries de una página, actualizar acá.
//
// type "layout" en "/" revalida todo el sitio (el layout raíz y todo lo que
// cuelga de él); "page" en una ruta con [slug] revalida todas esas páginas.

export type RutaARevalidar = { path: string; type?: "page" | "layout" };

const TODO_EL_SITIO: RutaARevalidar[] = [{ path: "/", type: "layout" }];

const RUTAS_POR_TIPO: Record<string, RutaARevalidar[]> = {
  configuradorModelos: [{ path: "/configurador" }],
  configuradorPage: [{ path: "/configurador" }],
  // siteConfig (WhatsApp, precios de extras, metadata) lo leen el layout y
  // casi todas las páginas.
  siteConfig: TODO_EL_SITIO,
  // homePage también la lee el layout: los cupos de la barra de WhatsApp
  // que aparece en todas las páginas.
  homePage: TODO_EL_SITIO,
  // Los modelos se muestran en la home (cards), en /modelos, en cada ficha,
  // en /modelos/flex (galería) y en el sitemap.
  modelo: [
    { path: "/" },
    { path: "/modelos" },
    { path: "/modelos/flex" },
    { path: "/modelos/[slug]", type: "page" },
    { path: "/sitemap.xml" },
  ],
  quienesSomos: [{ path: "/nosotros" }],
  faqPage: [{ path: "/faq" }, { path: "/" }],
};

export function rutasARevalidar(tipo: string): RutaARevalidar[] {
  return RUTAS_POR_TIPO[tipo] ?? [];
}

export const TIPOS_CON_REVALIDACION = Object.keys(RUTAS_POR_TIPO);
