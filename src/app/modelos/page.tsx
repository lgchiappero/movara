import type { Metadata } from "next";
import { client } from "@/sanity/lib/client";
import { MODELOS_QUERY, FLEX_CARD_QUERY } from "@/sanity/lib/queries";
import { type ProductModel } from "@/data/models";
import CatalogGrid from "@/components/catalog/CatalogGrid";
import FlexFeatureCard, { type FlexCardData } from "@/components/modelos/FlexFeatureCard";

export const metadata: Metadata = {
  title: "Catálogo de Modelos — MOVARA",
  description:
    "Explorá nuestros modelos de casas modulares: vivienda familiar, alquiler turístico y oficinas. Precios, planos y especificaciones.",
};

export const revalidate = 3600;

// "MOVARA Flex" existe como documento "modelo" (para poder ordenarse junto
// al resto vía el campo "order") pero en esta página ya se muestra aparte,
// como tarjeta destacada fija (ver FlexFeatureCard/FLEX_CARD_QUERY más
// abajo) — se filtra acá para no duplicarlo en la grilla.
const FLEX_SLUG = "movara-flex";

// Sin fallback a datos hardcodeados: el catálogo muestra exactamente lo que
// hay en Sanity. Si la consulta falla o no hay modelos cargados, se muestra
// vacío en vez de sustituir con contenido de ejemplo.
async function getModelos(): Promise<ProductModel[]> {
  try {
    const data = await client.fetch<ProductModel[]>(MODELOS_QUERY);
    return Array.isArray(data) ? data.filter((m) => m.slug !== FLEX_SLUG) : [];
  } catch {
    return [];
  }
}

async function getFlex(): Promise<FlexCardData> {
  try {
    return await client.fetch<FlexCardData>(FLEX_CARD_QUERY);
  } catch {
    return null;
  }
}

export default async function CatalogPage() {
  const [models, flex] = await Promise.all([getModelos(), getFlex()]);

  return (
    <>
      {/* Page header */}
      <div className="bg-sage-50 border-b border-sage-100 pt-28 pb-14">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <p className="text-sage-600 text-sm font-semibold uppercase tracking-widest mb-3">
            Catálogo completo
          </p>
          <h1 className="text-4xl lg:text-5xl font-bold text-stone-900 tracking-tight">
            Nuestros modelos
          </h1>
          <p className="mt-4 text-stone-500 text-lg max-w-xl">
            Todos los modelos son personalizables en distribución, terminaciones y
            colores. Entregamos en toda la Argentina.
          </p>
        </div>
      </div>

      {/* MOVARA Flex */}
      <div className="max-w-7xl mx-auto px-6 lg:px-8 pt-14">
        <FlexFeatureCard flex={flex} ctaLabel="Ver modelo" />
      </div>

      {/* Catalog */}
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-14">
        <CatalogGrid models={models} />
      </div>
    </>
  );
}
