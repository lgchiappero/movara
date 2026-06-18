import type { Metadata } from "next";
import { client } from "@/sanity/lib/client";
import { MODELOS_QUERY } from "@/sanity/lib/queries";
import { MODELS, type ProductModel } from "@/data/models";
import CatalogGrid from "@/components/catalog/CatalogGrid";

export const metadata: Metadata = {
  title: "Catálogo de Modelos — MOVARA",
  description:
    "Explorá nuestros modelos de casas modulares: vivienda familiar, alquiler turístico y oficinas. Precios, planos y especificaciones.",
};

export const revalidate = 3600;

async function getModelos(): Promise<ProductModel[]> {
  try {
    const data = await client.fetch<ProductModel[]>(MODELOS_QUERY);
    if (Array.isArray(data) && data.length > 0) return data;
  } catch {
    // Sanity unavailable — fall through to static data
  }
  return MODELS;
}

export default async function CatalogPage() {
  const models = await getModelos();

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

      {/* Catalog */}
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-14">
        <CatalogGrid models={models} />
      </div>
    </>
  );
}
