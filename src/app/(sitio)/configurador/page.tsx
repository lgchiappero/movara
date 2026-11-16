import type { Metadata } from "next";
import { Suspense } from "react";
import ConfiguradorMovara, { type ModeloKey } from "@/components/configurador/ConfiguradorMovara";
import ConfiguradorModeloReader from "@/components/configurador/ConfiguradorModeloReader";
import { client } from "@/sanity/lib/client";
import { CONFIGURADOR_PAGE_QUERY, SITE_CONFIG_QUERY, CONFIGURADOR_MODELOS_QUERY } from "@/sanity/lib/queries";
import { urlImagenCompleta } from "@/sanity/lib/image";

// Contenido del CMS: cambia poco, se sirve estático y se revalida cada 1h.
// `force-static` es una barrera explícita: si alguien reintroduce una API
// dinámica (searchParams/cookies/headers) en esta página, el build falla
// en vez de degradar silenciosamente a SSR por request.
export const dynamic = "force-static";
// Respaldo: el webhook de Sanity (/api/revalidate) regenera al publicar.
export const revalidate = 300;

export const metadata: Metadata = {
  title: "Configurador — MOVARA",
  description:
    "Diseñá tu módulo MOVARA en 3 pasos: elegí el tamaño, el uso y la ubicación. Recibí un presupuesto personalizado al instante por WhatsApp.",
};

async function getConfiguradorData() {
  try {
    return await client.fetch(CONFIGURADOR_PAGE_QUERY);
  } catch {
    return null;
  }
}

async function getPrecios() {
  try {
    return await client.fetch(SITE_CONFIG_QUERY);
  } catch {
    return null;
  }
}

type SanityAsset = { _ref: string; _type: string };
type SanityImage = { asset?: SanityAsset; hotspot?: unknown; crop?: unknown; label?: string };
type ModeloImagenesRaw = { imagenPrincipal?: SanityImage | null; galeria?: SanityImage[] | null };

// Placeholder cuando el modelo todavía no tiene fotos cargadas en Sanity —
// mismo archivo que ya se usa como fallback de galería en /modelos/flex.
const PLACEHOLDER_IMG = "/banner-hero.webp";

function buildUrls(m?: ModeloImagenesRaw | null): string[] {
  const urls: string[] = [];
  // Foto completa (fit("max"), un solo eje): respeta el crop del Studio si
  // está cargado, y la card la muestra entera (object-contain).
  if (m?.imagenPrincipal?.asset?._ref) {
    urls.push(urlImagenCompleta(m.imagenPrincipal, 1200));
  }
  const galeria = (m?.galeria ?? []).filter((img): img is SanityImage & { asset: SanityAsset } => !!img?.asset?._ref);
  for (const img of galeria) {
    urls.push(urlImagenCompleta(img, 1200));
  }
  return urls.length > 0 ? urls : [PLACEHOLDER_IMG];
}

async function getModeloImagenes(): Promise<Record<ModeloKey, string[]>> {
  try {
    const data = await client.fetch<{
      flex18?: ModeloImagenesRaw | null;
      flex38?: ModeloImagenesRaw | null;
      flex77?: ModeloImagenesRaw | null;
    } | null>(CONFIGURADOR_MODELOS_QUERY);
    return {
      "10ft": buildUrls(data?.flex18),
      "20ft": buildUrls(data?.flex38),
      "40ft": buildUrls(data?.flex77),
    };
  } catch {
    return { "10ft": [PLACEHOLDER_IMG], "20ft": [PLACEHOLDER_IMG], "40ft": [PLACEHOLDER_IMG] };
  }
}

export default async function ConfiguradorPage() {
  const [data, precios, modeloImagenes] = await Promise.all([
    getConfiguradorData(),
    getPrecios(),
    getModeloImagenes(),
  ]);

  // `?modelo=` solo afecta el estado inicial del cliente, no el render del
  // servidor: se lee con useSearchParams() dentro de un Suspense boundary
  // para que el resto de la página se genere estática. El fallback es el
  // mismo componente sin preselección, así no hay salto visual mientras
  // hidrata.
  return (
    <Suspense fallback={<ConfiguradorMovara data={data} precios={precios} modeloImagenes={modeloImagenes} />}>
      <ConfiguradorModeloReader data={data} precios={precios} modeloImagenes={modeloImagenes} />
    </Suspense>
  );
}
