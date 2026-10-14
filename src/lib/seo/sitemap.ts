import type { MetadataRoute } from "next";
import { hrefModelo } from "@/lib/modelos/rutas";
import { URL_PUBLICA } from "@/lib/recibos/constantes";

/** Páginas públicas fijas del sitemap. */
export const PAGINAS_PUBLICAS = [
  "/",
  "/modelos",
  "/configurador",
  "/agendar",
  "/faq",
  "/quienes-somos",
  "/producto",
  "/privacidad",
  "/terminos",
] as const;

/** Rutas privadas o con token: fuera del sitemap y bloqueadas en robots.txt. */
export const RUTAS_PRIVADAS = ["/admin", "/studio", "/api", "/recibo", "/mi-pedido", "/agendar/cancelar"] as const;

export type ModeloSitemap = { slug?: string | null; actualizado?: string | null };

export function urlAbsoluta(ruta: string): string {
  return ruta === "/" ? URL_PUBLICA : `${URL_PUBLICA}${ruta}`;
}

/** Arma el sitemap: páginas fijas + una entrada por modelo de Sanity (sin
 * repetir si un modelo cae en una ruta fija y sin rutas privadas). */
export function construirSitemap(modelos: ModeloSitemap[]): MetadataRoute.Sitemap {
  const entradas: MetadataRoute.Sitemap = PAGINAS_PUBLICAS.map((ruta) => ({
    url: urlAbsoluta(ruta),
    changeFrequency: ruta === "/" || ruta === "/modelos" ? "weekly" : "monthly",
    priority: ruta === "/" ? 1 : ruta === "/modelos" ? 0.9 : 0.6,
  }));
  const vistas = new Set<string>(PAGINAS_PUBLICAS);
  for (const modelo of modelos) {
    if (!modelo.slug) continue;
    const ruta = hrefModelo(modelo.slug);
    if (vistas.has(ruta)) continue;
    vistas.add(ruta);
    entradas.push({
      url: urlAbsoluta(ruta),
      ...(modelo.actualizado ? { lastModified: new Date(modelo.actualizado) } : {}),
      changeFrequency: "monthly",
      priority: 0.8,
    });
  }
  return entradas.filter((e) => !RUTAS_PRIVADAS.some((p) => new URL(e.url).pathname.startsWith(p)));
}
