import type { MetadataRoute } from "next";
import { client } from "@/sanity/lib/client";
import { MODELOS_SITEMAP_QUERY } from "@/sanity/lib/queries";
import { construirSitemap, type ModeloSitemap } from "@/lib/seo/sitemap";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  let modelos: ModeloSitemap[] = [];
  try {
    modelos = await client.fetch<ModeloSitemap[]>(MODELOS_SITEMAP_QUERY);
  } catch {
    // Sin Sanity, el sitemap sale igual con las páginas fijas.
  }
  return construirSitemap(modelos);
}
