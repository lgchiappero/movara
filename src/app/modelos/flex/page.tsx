import type { Metadata } from "next";
import { client } from "@/sanity/lib/client";
import { FLEX_PAGE_QUERY, SITE_CONFIG_QUERY } from "@/sanity/lib/queries";
import FlexPageClient, { type FlexPageData } from "@/components/flex/FlexPageClient";

// Respaldo: el webhook de Sanity (/api/revalidate) regenera al publicar.
export const revalidate = 300;

export const metadata: Metadata = {
  title: "MOVARA Flex — MOVARA",
  description:
    "MOVARA Flex: una unidad plegable y expandible que se transporta cerrada y se despliega en destino. Specs técnicas, extras y precio por m².",
};

async function getPageData() {
  try {
    const [flexPage, siteConfig] = await Promise.all([
      client.fetch<FlexPageData | null>(FLEX_PAGE_QUERY),
      client.fetch<{ whatsappNumber?: string | null }>(SITE_CONFIG_QUERY),
    ]);
    return {
      data: flexPage ?? null,
      waNumber: siteConfig?.whatsappNumber ?? null,
    };
  } catch {
    return { data: null, waNumber: null };
  }
}

export default async function FlexPage() {
  const { data, waNumber } = await getPageData();

  return <FlexPageClient data={data} waNumber={waNumber} />;
}
