import type { Metadata } from "next";
import ProductoPageClient from "@/components/producto/ProductoPageClient";
import { client } from "@/sanity/lib/client";
import { SITE_CONFIG_QUERY } from "@/sanity/lib/queries";
import type { PreciosConfig } from "@/data/precios-extras";

// Los precios de los extras vienen de Sanity: estática, revalidada cada 1h
// (igual que el configurador).
// Respaldo: el webhook de Sanity (/api/revalidate) regenera al publicar.
export const revalidate = 300;

export const metadata: Metadata = {
  title: "Ficha técnica MOVARA Flex — MOVARA",
  description:
    "Especificaciones técnicas completas del MOVARA Flex: estructura de acero galvanizado, aislación, instalaciones y certificaciones internacionales.",
};

async function getPrecios(): Promise<PreciosConfig | null> {
  try {
    return await client.fetch<PreciosConfig | null>(SITE_CONFIG_QUERY);
  } catch {
    return null;
  }
}

export default async function ProductoPage() {
  return <ProductoPageClient precios={await getPrecios()} />;
}
