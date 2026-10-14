import type { MetadataRoute } from "next";
import { RUTAS_PRIVADAS, urlAbsoluta } from "@/lib/seo/sitemap";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: [...RUTAS_PRIVADAS] },
    sitemap: urlAbsoluta("/sitemap.xml"),
  };
}
